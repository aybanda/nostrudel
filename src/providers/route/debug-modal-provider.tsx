import { NostrEvent } from "nostr-tools";
import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from "react";

import EventDebugModal from "../../components/debug-modal/event-debug-modal";
import useRouteStateValue from "../../hooks/use-route-state-value";
import { UNSAFE_DataRouterContext } from "react-router-dom";
import useRouterMarker from "../../hooks/use-router-marker";

export const DebugModalContext = createContext({
  open: (event: NostrEvent) => {},
});

export default function DebugModalProvider({ children }: PropsWithChildren) {
  const routeState = useRouteStateValue("debug", false);
  const { router } = useContext(UNSAFE_DataRouterContext)!;
  const marker = useRouterMarker(router);
  const [event, setEvent] = useState<NostrEvent>();

  if (routeState.value !== true) marker.reset();

  const open = useCallback(
    (event: NostrEvent) => {
      setEvent(event);
      marker.set();
      routeState.setValue(true, false);
    },
    [setEvent, marker.set, routeState.setValue],
  );
  const close = useCallback(() => {
    setEvent(undefined);
    if (marker.index.current) router.navigate(marker.index.current);
    marker.reset();
  }, [marker.reset, marker.index, router.navigate]);

  const context = useMemo(() => ({ open }), [open]);

  return (
    <DebugModalContext.Provider value={context}>
      {children}
      {routeState.value && event && <EventDebugModal event={event} isOpen onClose={close} />}
    </DebugModalContext.Provider>
  );
}
