import type { NextPage } from "next";
import { useMachine } from "@xstate/react";
import { orderBookMachine } from "../machine/orderBook";
import React, { useEffect } from "react";
import { useToast } from "@chakra-ui/react";
import { OrderBookContext, OrderBookEvent } from "../interfaces/orderBook";
import { OrderBook } from "../components/orderBook";
import { useWindowSize } from "react-use";
import tabFocusMachine, {
  TabFocusMachineContext,
  TabFocusMachineEvent,
} from "../machine/tabFocus";

const Home: NextPage = () => {
  const toast = useToast();
  const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL as string;
  const feed = process.env.NEXT_PUBLIC_WEBSOCKET_FEED as string;
  const productIds = process.env.NEXT_PUBLIC_WEBSOCKET_PRODUCT_IDS?.split(
    ","
  ) as Array<string>;
  let subscribedProductId = productIds[0];

  const [state, send] = useMachine<OrderBookContext, OrderBookEvent>(
    orderBookMachine,
    { devTools: true }
  );
  const [tabFocus] = useMachine<TabFocusMachineContext, TabFocusMachineEvent>(
    tabFocusMachine
  );

  useEffect(() => {
    if (tabFocus.matches("userIsNotOnTab")) {
      if (state.matches("connected.subscribed")) {
        send("DISCONNECT");
      }
    }
  }, [tabFocus]);

  useEffect(() => {
    if (tabFocus.matches("userIsOnTab")) {
      if (state.matches("disconnected")) {
        send("CONNECT", { socketUrl });
      } else if (state.matches("connected.unsubscribed")) {
        send("SUBSCRIBE", { productId: subscribedProductId, feed });
      }
    }

    if (state.matches("connected.subscribed.listening")) {
      toast({
        title: `Subscribed to feed with product id "${state.context.subscribedProductId}"`,
        position: "top-right",
        status: "success",
        isClosable: true,
      });
    }
    if (state.matches("connected.error")) {
      toast({
        title: `Error`,
        description: state.context.error,
        position: "top-right",
        status: "error",
        isClosable: true,
      });
    }
    if (state.changed && state.matches("disconnected")) {
      toast({
        title: `Disconnected from server`,
        position: "top-right",
        status: "info",
        isClosable: true,
      });
    }
  }, [state]);

  const { width, height } = useWindowSize();
  const isVertical = width < 768;

  const toggleFeed = () => {
    subscribedProductId =
      state.context.subscribedProductId === productIds[0]
        ? productIds[1]
        : productIds[0];
    send("UNSUBSCRIBE");
    send("SUBSCRIBE", { productId: subscribedProductId, feed });
  };

  const calculateData = () => {
    // vertical dimensions
    // - 200px height when mobile
    // - 66px per row (2 tables vertically)
    //
    // horizontal dimensions
    // - 200px height from top when not mobile
    // - 33px per row
    const rowsToShow = Math.floor((height - 200) / (isVertical ? 66 : 33));
    send("CALCULATE", { rowsToShow });
  };

  const connectToWebSocket = () => {
    send("CONNECT", { socketUrl });
  };

  return (
    <OrderBook
      data={state.context}
      toggleFeed={toggleFeed}
      calculateData={calculateData}
      isVertical={isVertical}
      connectToWebSocket={connectToWebSocket}
      isConnected={state.matches("connected")}
    />
  );
};

export default Home;
