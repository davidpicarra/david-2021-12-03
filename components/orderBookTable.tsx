import React from "react";
import { Table, Thead, Tbody, Tr, Th, Td } from "@chakra-ui/react";
import { formatNumber, formatPrice } from "../utils/format";
import {
  OrderBookCalculatedData,
  OrderBookElementData,
} from "../interfaces/orderBook";

export interface OrderBookTableProps {
  calculatedData: OrderBookCalculatedData;
  type: "asks" | "bids";
  isVertical: boolean;
}

const gradientBuilder = (
  type: string,
  colour: string,
  percentage: number,
  isVertical: boolean
) => {
  return !isVertical && type === "bids"
    ? `linear-gradient(to-l, ${colour} ${percentage}%, transparent ${percentage}%)`
    : `linear-gradient(to-r, ${colour} ${percentage}%, transparent ${percentage}%)`;
};

export const OrderBookTable: React.FC<OrderBookTableProps> = ({
  calculatedData,
  type,
  isVertical,
}) => {
  const rows =
    type === "asks"
      ? [...calculatedData.parsedAsks]
      : [...calculatedData.parsedBids];
  const cssProps = {
    priceColor: "rgb(197, 48, 48)",
    gradientColor: "rgb(197, 48, 48, 0.3)",
  };
  if (type === "bids") {
    cssProps.priceColor = "rgb(47, 133, 90)";
    cssProps.gradientColor = "rgb(47, 133, 90, 0.3)";
  }

  const columns = [
    {
      header: "price",
      props: {
        color: cssProps.priceColor,
      },
    },
    { header: "size" },
    { header: "total" },
  ];

  if (!isVertical && type === "bids") {
    columns.reverse();
  } else if (isVertical && type === "asks") {
    rows.reverse();
  }
  const getValue = (type: string, elementData: OrderBookElementData) => {
    switch (type) {
      case "price":
        return formatPrice(elementData.price);
      case "total":
        return formatNumber(elementData.partialTotal);
      case "size":
        return formatNumber(elementData.size);
    }
  };

  return (
    <Table size="sm">
      <Thead>
        <Tr>
          {columns.map(({ header }) => (
            <Th isNumeric key={header}>
              {header.toUpperCase()}
            </Th>
          ))}
        </Tr>
      </Thead>
      <Tbody flexDirection="row-reverse">
        {rows.map((elementData, rowIndex) => {
          return (
            <Tr
              key={rowIndex}
              bgGradient={gradientBuilder(
                type,
                cssProps.gradientColor,
                Math.max(
                  1,
                  (elementData.partialTotal / calculatedData.grandTotal) * 100
                ),
                isVertical
              )}
            >
              {columns.map(({ header, props }, columnIndex) => (
                <Td
                  border="0"
                  isNumeric
                  key={`${rowIndex}.${columnIndex}`}
                  {...props}
                >
                  {getValue(header, elementData)}
                </Td>
              ))}
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};
