import {
  calculateOrderBook,
  parseOrderBookMessage,
} from "../orderBook.actions";
import { OrderBookData, WebSocketMessage } from "../../interfaces/orderBook";

describe("order book calculations", () => {
  const messages = {
    snapshot: {
      asks: [
        [1, 10],
        [2, 20],
        [3, 30],
      ],
      bids: [
        [1, 10],
        [2, 20],
        [3, 30],
      ],
    } as WebSocketMessage,
    deltaUpdate: {
      asks: [[3, 20]],
      bids: [
        [3, 20],
        [2, 20],
      ],
    } as WebSocketMessage,
    deltaDelete: {
      asks: [[3, 0]],
      bids: [
        [3, 20],
        [2, 0],
      ],
    } as WebSocketMessage,
    deltaCreate: {
      asks: [[5, 50]],
      bids: [[4, 40]],
    } as WebSocketMessage,
  };
  const emptyOrderBook = {
    asks: new Map<number, number>(),
    bids: new Map<number, number>(),
  } as OrderBookData;
  const rowsToShow = 5;

  const calculateSpreadPercentage = (spread: number, highestBid: number) =>
    (spread / highestBid) * 100;

  it("parses snapshot and calculates correctly", () => {
    // Arrange.
    const parsedOrderBook = parseOrderBookMessage(
      messages.snapshot,
      emptyOrderBook
    );

    // Act.
    const result = calculateOrderBook(parsedOrderBook, rowsToShow);

    // Assert.
    expect(result).toEqual({
      bids: new Map<number, number>([
        [1, 10],
        [2, 20],
        [3, 30],
      ]),
      asks: new Map<number, number>([
        [1, 10],
        [2, 20],
        [3, 30],
      ]),
      grandTotal: 60,
      spread: -2,
      spreadPercentage: calculateSpreadPercentage(-2, 3),
      parsedBids: [
        {
          partialTotal: 30,
          price: 3,
          size: 30,
        },
        {
          partialTotal: 50,
          price: 2,
          size: 20,
        },
        {
          partialTotal: 60,
          price: 1,
          size: 10,
        },
      ],
      parsedAsks: [
        {
          partialTotal: 10,
          price: 1,
          size: 10,
        },
        {
          partialTotal: 30,
          price: 2,
          size: 20,
        },
        {
          partialTotal: 60,
          price: 3,
          size: 30,
        },
      ],
    });
  });

  it("parses snapshot, delta with update and calculates correctly", () => {
    // Arrange.
    const partialResult = parseOrderBookMessage(
      messages.snapshot,
      emptyOrderBook
    );
    const parsedOrderBook = parseOrderBookMessage(
      messages.deltaUpdate,
      partialResult
    );

    // Act.
    const result = calculateOrderBook(parsedOrderBook, rowsToShow);

    // Assert.
    expect(result).toEqual({
      bids: new Map<number, number>([
        [1, 10],
        [2, 20],
        [3, 20],
      ]),
      asks: new Map<number, number>([
        [1, 10],
        [2, 20],
        [3, 20],
      ]),
      grandTotal: 50,
      spread: -2,
      spreadPercentage: calculateSpreadPercentage(-2, 3),
      parsedBids: [
        {
          partialTotal: 20,
          price: 3,
          size: 20,
        },
        {
          partialTotal: 40,
          price: 2,
          size: 20,
        },
        {
          partialTotal: 50,
          price: 1,
          size: 10,
        },
      ],
      parsedAsks: [
        {
          partialTotal: 10,
          price: 1,
          size: 10,
        },
        {
          partialTotal: 30,
          price: 2,
          size: 20,
        },
        {
          partialTotal: 50,
          price: 3,
          size: 20,
        },
      ],
    });
  });

  it("parses snapshot, delta with update, delta with delete and calculates correctly", () => {
    // Arrange.
    const partialResult1 = parseOrderBookMessage(
      messages.snapshot,
      emptyOrderBook
    );
    const partialResult2 = parseOrderBookMessage(
      messages.deltaUpdate,
      partialResult1
    );
    const parsedOrderBook = parseOrderBookMessage(
      messages.deltaDelete,
      partialResult2
    );

    // Act.
    const result = calculateOrderBook(parsedOrderBook, rowsToShow);

    // Assert.
    expect(result).toEqual({
      bids: new Map<number, number>([
        [1, 10],
        [3, 20],
      ]),
      asks: new Map<number, number>([
        [1, 10],
        [2, 20],
      ]),
      grandTotal: 30,
      spread: -2,
      spreadPercentage: calculateSpreadPercentage(-2, 3),
      parsedBids: [
        {
          partialTotal: 20,
          price: 3,
          size: 20,
        },
        {
          partialTotal: 30,
          price: 1,
          size: 10,
        },
      ],
      parsedAsks: [
        {
          partialTotal: 10,
          price: 1,
          size: 10,
        },
        {
          partialTotal: 30,
          price: 2,
          size: 20,
        },
      ],
    });
  });

  it("parses snapshot, delta with update, delta with delete, delta with create and calculates correctly", () => {
    // Arrange.
    const partialResult1 = parseOrderBookMessage(
      messages.snapshot,
      emptyOrderBook
    );
    const partialResult2 = parseOrderBookMessage(
      messages.deltaUpdate,
      partialResult1
    );
    const partialResult3 = parseOrderBookMessage(
      messages.deltaDelete,
      partialResult2
    );
    const parsedOrderBook = parseOrderBookMessage(
      messages.deltaCreate,
      partialResult3
    );

    // Act.
    const result = calculateOrderBook(parsedOrderBook, rowsToShow);

    // Assert.
    expect(result).toEqual({
      bids: new Map<number, number>([
        [1, 10],
        [3, 20],
        [4, 40],
      ]),
      asks: new Map<number, number>([
        [1, 10],
        [2, 20],
        [5, 50],
      ]),
      grandTotal: 80,
      spread: -3,
      spreadPercentage: calculateSpreadPercentage(-3, 4),
      parsedBids: [
        {
          partialTotal: 40,
          price: 4,
          size: 40,
        },
        {
          partialTotal: 60,
          price: 3,
          size: 20,
        },
        {
          partialTotal: 70,
          price: 1,
          size: 10,
        },
      ],
      parsedAsks: [
        {
          partialTotal: 10,
          price: 1,
          size: 10,
        },
        {
          partialTotal: 30,
          price: 2,
          size: 20,
        },
        {
          partialTotal: 80,
          price: 5,
          size: 50,
        },
      ],
    });
  });
});
