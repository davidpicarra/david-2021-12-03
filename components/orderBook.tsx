import React, { useEffect } from "react";
import {
  Button,
  Container,
  Grid,
  GridItem,
  Heading,
  Text,
} from "@chakra-ui/react";
import { OrderBookTable } from "../components/orderBookTable";
import { OrderBookData } from "../interfaces/orderBook";
import { formatPrice } from "../utils/format";

export interface OrderBookProps {
  data: OrderBookData;
  toggleFeed: () => void;
  calculateData: () => void;
  connectToWebSocket: () => void;
  isVertical: boolean;
  isConnected: boolean;
}

const OrderBookComponent: React.FC<OrderBookProps> = ({
  data,
  toggleFeed,
  connectToWebSocket,
  isVertical,
  isConnected,
}) => {
  const { spread, spreadPercentage } = data;

  const beforeRenderTime = Date.now();
  useEffect(() => {
    const renderTime = Date.now() - beforeRenderTime;
    if (renderTime > updateInterval) {
      updateInterval = renderTime;
    } else if (updateInterval > 200) {
      updateInterval = Math.max(200, renderTime);
    }
  });

  return (
    <Container maxW="5xl">
      <Grid
        gridTemplateAreas={{
          md: `'title spread' 'bids asks' 'toggle toggle'`,
          base: `'title title' 'asks asks' 'spread spread' 'bids bids' 'toggle toggle'`,
        }}
        gridTemplateColumns={{
          md: `repeat(2, 1fr)`,
          base: `auto`,
        }}
        gridTemplateRows={{
          md: "30px 1fr 50px",
          base: "30px 1fr 25px 1fr 50px",
        }}
        p="10"
        pb="0"
        rowGap={{
          md: "4",
          base: "2",
        }}
      >
        <GridItem gridArea="title">
          <Heading size="md">Order book</Heading>
        </GridItem>

        <GridItem gridArea="spread" gridColumnStart="1">
          <Text textAlign="center">
            Spread {formatPrice(spread)} ({spreadPercentage.toFixed(2)}%)
          </Text>
        </GridItem>

        <GridItem gridArea="bids">
          <OrderBookTable
            calculatedData={data}
            type="bids"
            isVertical={isVertical}
          />
        </GridItem>

        <GridItem gridArea="asks">
          <OrderBookTable
            calculatedData={data}
            type="asks"
            isVertical={isVertical}
          />
        </GridItem>

        <GridItem gridArea="toggle" textAlign="center">
          <Button background="purple.800" onClick={toggleFeed}>
            Toggle Feed
          </Button>
          <Button
            background="purple.800"
            onClick={connectToWebSocket}
            ml="2"
            isDisabled={isConnected}
          >
            {isConnected ? "Connected.." : "Reconnect"}
          </Button>
        </GridItem>
      </Grid>
    </Container>
  );
};

let updateInterval = 200; // in milliseconds
let lastUpdated = 0;
/**
 * Render only when:
 * - !nextProps.isConnected - redraw before disconnected
 * - prevProps.isVertical !== nextProps.isVertical - redraw when swapping between vertical and horizontal view
 * - lastUpdated is old enough and there's data to show
 */
export const OrderBook = React.memo(
  OrderBookComponent,
  (prevProps, nextProps) => {
    if (
      !nextProps.isConnected ||
      prevProps.isVertical !== nextProps.isVertical ||
      (lastUpdated + updateInterval < Date.now() &&
        nextProps.data.asks.size > 0)
    ) {
      lastUpdated = Date.now();
      prevProps.calculateData();
      return false;
    }
    return true;
  }
);
