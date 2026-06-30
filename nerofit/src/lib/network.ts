import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

// Teach TanStack Query about real device connectivity so queries pause while
// offline and refetch on reconnect. The NetInfo subscription lives for the app
// lifetime; onlineManager owns its teardown, so there's nothing to return.
export function initOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    }),
  );
}
