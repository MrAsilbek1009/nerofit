import ExpoModulesCore
import HealthKit

// Read-only HealthKit bridge: today's steps + active energy. All queries resolve
// null on any failure so the JS wrapper can fall back to the pedometer/estimate.
public class NerofitHealthModule: Module {
  private let store = HKHealthStore()

  private var readTypes: Set<HKObjectType> {
    var set = Set<HKObjectType>()
    if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
      set.insert(steps)
    }
    if let energy = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
      set.insert(energy)
    }
    return set
  }

  public func definition() -> ModuleDefinition {
    Name("NerofitHealth")

    Function("isAvailable") { () -> Bool in
      HKHealthStore.isHealthDataAvailable()
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      self.store.requestAuthorization(toShare: [], read: self.readTypes) { success, error in
        if let error = error {
          promise.reject("E_HEALTH_AUTH", error.localizedDescription)
        } else {
          promise.resolve(success)
        }
      }
    }

    AsyncFunction("getTodaySteps") { (promise: Promise) in
      self.sumToday(.stepCount, unit: HKUnit.count(), promise: promise)
    }

    AsyncFunction("getTodayActiveEnergy") { (promise: Promise) in
      self.sumToday(.activeEnergyBurned, unit: HKUnit.kilocalorie(), promise: promise)
    }
  }

  // Cumulative sum of a quantity type since local midnight. Resolves null when
  // HealthKit is unavailable or the query errors (e.g. no authorization).
  private func sumToday(_ identifier: HKQuantityTypeIdentifier, unit: HKUnit, promise: Promise) {
    guard HKHealthStore.isHealthDataAvailable(),
          let type = HKQuantityType.quantityType(forIdentifier: identifier) else {
      promise.resolve(nil)
      return
    }
    let start = Calendar.current.startOfDay(for: Date())
    let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)
    let query = HKStatisticsQuery(
      quantityType: type,
      quantitySamplePredicate: predicate,
      options: .cumulativeSum
    ) { _, statistics, error in
      if error != nil {
        promise.resolve(nil)
        return
      }
      let value = statistics?.sumQuantity()?.doubleValue(for: unit)
      promise.resolve(value)
    }
    store.execute(query)
  }
}
