import { ChakraTheme, extendTheme } from "@chakra-ui/react";
import "@fontsource/ibm-plex-sans";

const overrides: Partial<ChakraTheme> = {
  config: {
    initialColorMode: "dark",
    useSystemColorMode: false,
  },
  fonts: {
    body: "IBM Plex Sans, sans-seriff",
    heading: "IBM Plex Sans, sans-seriff",
  },
};

const theme = extendTheme(overrides);

export default theme;
