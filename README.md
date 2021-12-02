# David Piçarra - Order Book

[![build](https://github.com/davidpicarra/david-2021-12-03/actions/workflows/build.yml/badge.svg)](https://github.com/davidpicarra/david-2021-12-03/actions/workflows/build.yml)

Order Book made with [React][react], [Next.js][nextjs], [TypeScript][typescript], [XState][xstate] and [Chakra UI][chakraui].

## Brief

This Order Book project connects to a Web Socket to fetch a snapshot and consequent updates of a order book associated to a product.

[See it in action][orderbook]

## Project structure

### /components

Contains two main components, the overall [`OverBook`](./components/orderBook.tsx) layout and the [`OverBookTable`](./components/orderBookTable.tsx) to render a single table

### /interfaces

Defines all common interfaces:

- [`OrderBookEvent`](./interfaces/orderBook.ts#L27) - Events that can be sent to the OrderBookMachine
- [`OrderBookContext`](./interfaces/orderBook.ts#L19) - The context of the OrderBookMachine (extends OrderBookData)
- [`OrderBookData`](./interfaces/orderBook.ts#L14) - Contains the raw bids and asks processed and extends OrderBookCalculatedData
- [`OrderBookCalculatedData`](./interfaces/orderBook.ts#L6) - Contains calculated Order Book data from the raw bids and asks
- [`WebSocketPayload`](./interfaces/orderBook.ts#L38) - The accepted payload structure by the WebSocket
- [`WebSocketMessage`](./interfaces/orderBook.ts#L44) - Messages received via WebSocket will be of this type

### /machine

Contains two machines:

- [OrderBookMachine](#state-machine)
- [TabFocusMachine][tabfocusmachine]

### /pages

Root level page that handles both state machines defined above and uses the [`OverBook`](./components/orderBook.tsx) component to render the relevant Order Book data

### /theme

Contains simple theming definition for Chakra UI

### /utils

Exports a few utility functions to parse Numbers as needed

## State Machine

![state-machine](./docs/state-machine.png?raw)

The OrderBookMachine has the states and possible events as shown in the image above.

The state machine starts in the "`disconnected`" state.

It is possible to connect to a URL by sending the event `connect(socketUrl)`. This will transition to the state `connecting` until the `open` event of the WebSocket is received. Upon reception of the `open` event, the state machine will transition to the "`connected`" state.

### Connected to the WebSocket

The "`connected`" state has inner states to represent the different stages of the communication with the WebSocket. The initial state is "`connected.unsubscribed`".

While in the "`connected.unsubscribed`" state it is possible to subscribe to a product by sending the event `subscribe(productId, feed)`, as per the WebSocket accepted payloads. This will transition to the "`connected.subscribed`" state where the state machine can interpret WebSocket messages and calculate the order book data on demand.

While in the "`connected.subscribed`" the initial state is "`connected.subscribed.listening`". When receiving a message from the WebSocket and for any future messages, the state machine will transition to the state "`connected.subscribed.messageReceived`".

It is possible to trigger the order book calculations by sending the event `calculate(rowsToShow)`, which will calculate and populate the necessary data according to the amount of rows needed to be shown.

While in the "`connected.subscribed`" state, it is possible to unsubscribe from the product by sending the event `unsubscribe()` which will transition to the state "`connected.subscribed`"

### Error handling

If at any time while the WebSocket is open an event of type `error` is received then the state machine will transition to the "`error`" state with an error message stored in the state machine.

If at any time while the WebSocket is open an event of type `close` is received then the state machine will transition to the "`disconnected`" state.

## Optimizations

Rerender requests are throttled by only triggering the re-render of the `OrderBook` if a certain amount of time has passed since last render. The calculation of the order book is also only triggered when the re-render is allowed. ([src](./components/orderBook.tsx#L110-133))

Rerender throttling time is variable and adjusted per re-render of the `OrderBook`. This is a simple approach to try to increase the update interval if the render time is taking longer than the update interval. ([src](./components/orderBook.tsx#L32-41))

[orderbook]: https://david-2021-12-03.vercel.app/
[react]: https://reactjs.org/
[nextjs]: https://nextjs.org/
[xstate]: https://xstate.js.org/
[typescript]: https://www.typescriptlang.org/
[chakraui]: https://chakra-ui.com/
[tabfocusmachine]: https://xstate-catalogue.com/machines/tab-focus
