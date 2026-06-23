import React, { createContext, useContext, useState, useEffect } from "react";
import { getWtfSettings } from "../api";

const WtfBackgroundContext = createContext();

export const useWtfBackground = () => {
  const context = useContext(WtfBackgroundContext);
  if (!context) {
    throw new Error(
      "useWtfBackground must be used within a WtfBackgroundProvider"
    );
  }
  return context;
};

export const WtfBackgroundProvider = ({ children }) => {
  const [backgroundSettings, setBackgroundSettings] = useState({
    backgroundType: "color",
    backgroundColor: "#f8fafc",
    backgroundImage: null,
    fontColor: "#0f172a",
    fontFamily: null,
    fontUrl: null,
    isLoading: true,
    error: null,
  });

  // Function to load Google Fonts
  const loadGoogleFont = (fontName) => {
    if (!fontName) return;



    // Check if font is already loaded
    const existingLink = document.querySelector(
      `link[href*="${fontName.replace(/\s+/g, "+")}"]`
    );
    if (existingLink) {

      return;
    }

    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(
      /\s+/g,
      "+"
    )}:wght@300;400;500;600;700&display=swap`;
    link.rel = "stylesheet";

    // Add event listeners to track loading
    link.onload = () => {

      // Re-apply font after loading
      setTimeout(() => {
        const category = getFontCategory(fontName);
        const fontFamilyValue = `"${fontName}", ${category}`;
        document.documentElement.style.setProperty(
          "--wtf-font-family",
          fontFamilyValue
        );
      }, 100);
    };

    link.onerror = () => {
      console.error("Failed to load font:", fontName);
    };

    document.head.appendChild(link);

  };

  // Function to get font category for fallback
  const getFontCategory = (fontName) => {
    const fontCategories = {
      Roboto: "sans-serif",
      "Open Sans": "sans-serif",
      Lato: "sans-serif",
      Poppins: "sans-serif",
      Montserrat: "sans-serif",
      "Source Sans Pro": "sans-serif",
      Raleway: "sans-serif",
      "PT Sans": "sans-serif",
      Ubuntu: "sans-serif",
      "Playfair Display": "serif",
      Merriweather: "serif",
      Lora: "serif",
      "Patrick Hand": "handwriting",
      "Indie Flower": "handwriting",
      "Shadows Into Light": "handwriting",
      Caveat: "handwriting",
      "Dancing Script": "handwriting",
      Pacifico: "handwriting",
      Kalam: "handwriting",
      "Architects Daughter": "handwriting",
      "Gloria Hallelujah": "handwriting",
      "Permanent Marker": "handwriting",
      Satisfy: "handwriting",
      Bangers: "display",
      "Fredoka One": "display",
      Righteous: "display",
      Lobster: "display",
      Bungee: "display",
      "Press Start 2P": "display",
      Orbitron: "display",
      Audiowide: "display",
      Monoton: "display",
    };

    return fontCategories[fontName] || "sans-serif";
  };

  // Function to apply font globally
  const applyFontGlobally = (fontName) => {
    if (!fontName) return;



    // Load the font
    loadGoogleFont(fontName);

    // Set CSS custom property for global use
    const category = getFontCategory(fontName);
    const fontFamilyValue = `"${fontName}", ${category}`;



    // Set CSS custom property
    document.documentElement.style.setProperty(
      "--wtf-font-family",
      fontFamilyValue
    );

    // Apply to html, body, and all elements more aggressively
    document.documentElement.style.fontFamily = fontFamilyValue;
    document.body.style.fontFamily = fontFamilyValue;

    // Force apply to all elements
    const allElements = document.querySelectorAll("*");
    allElements.forEach((element) => {
      element.style.fontFamily = fontFamilyValue;
    });


  };

  // Function to check if font is available
  const checkFontAvailability = (fontName) => {
    if (!fontName) return false;

    // Check if font is loaded in the document
    const fontLinks = document.querySelectorAll(
      'link[href*="fonts.googleapis.com"]'
    );
    const isFontLoaded = Array.from(fontLinks).some((link) =>
      link.href.includes(fontName.replace(/\s+/g, "+"))
    );


    return isFontLoaded;
  };

  // Function to force refresh font application
  const forceRefreshFont = (fontName) => {
    if (!fontName) return;


    const category = getFontCategory(fontName);
    const fontFamilyValue = `"${fontName}", ${category}`;

    // Force apply to all elements again
    document.documentElement.style.setProperty(
      "--wtf-font-family",
      fontFamilyValue
    );
    document.documentElement.style.fontFamily = fontFamilyValue;
    document.body.style.fontFamily = fontFamilyValue;

    // Also try to apply to specific WTF elements
    const wtfElements = document.querySelectorAll(
      "[data-wtf-section], .wtf-content"
    );
    wtfElements.forEach((element) => {
      element.style.fontFamily = fontFamilyValue;
    });


  };

  const fetchBackgroundSettings = async () => {
    try {
      setBackgroundSettings((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
      }));
      const response = await getWtfSettings();
      const settings = response.data;

      const newSettings = {
        backgroundType: settings.backgroundType || "color",
        backgroundColor: settings.backgroundColor || "#f8fafc",
        backgroundImage: settings.backgroundImage || null,
        fontColor: settings.fontColor || "#0f172a",
        fontFamily: settings.fontFamily || null,
        fontUrl: settings.fontUrl || null,
        isLoading: false,
        error: null,
      };

      setBackgroundSettings(newSettings);

      // Apply font globally if it exists
      if (newSettings.fontFamily) {
        applyFontGlobally(newSettings.fontFamily);
      }
    } catch (error) {
      console.error("Error fetching WTF background settings:", error);
      setBackgroundSettings((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to load background settings",
      }));
    }
  };

  const updateBackgroundSettings = (newSettings) => {
    const updatedSettings = {
      ...backgroundSettings,
      backgroundType: newSettings.backgroundType,
      backgroundColor: newSettings.backgroundColor,
      backgroundImage: newSettings.backgroundImage,
      fontColor: newSettings.fontColor || backgroundSettings.fontColor,
      fontFamily: newSettings.fontFamily || null,
      fontUrl: newSettings.fontUrl || null,
    };

    setBackgroundSettings(updatedSettings);

    // Apply font globally if it changed
    if (
      newSettings.fontFamily &&
      newSettings.fontFamily !== backgroundSettings.fontFamily
    ) {
      applyFontGlobally(newSettings.fontFamily);
    }
  };

  const getBackgroundStyle = () => {
    if (
      backgroundSettings.backgroundType === "image" &&
      backgroundSettings.backgroundImage
    ) {
      return {
        backgroundImage: `url(${backgroundSettings.backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
        color: backgroundSettings.fontColor || undefined,
        fontFamily: backgroundSettings.fontFamily
          ? `"${backgroundSettings.fontFamily}", ${getFontCategory(
              backgroundSettings.fontFamily
            )}`
          : undefined,
      };
    } else {
      return {
        backgroundColor: backgroundSettings.backgroundColor,
        color: backgroundSettings.fontColor || undefined,
        fontFamily: backgroundSettings.fontFamily
          ? `"${backgroundSettings.fontFamily}", ${getFontCategory(
              backgroundSettings.fontFamily
            )}`
          : undefined,
      };
    }
  };

  useEffect(() => {
    fetchBackgroundSettings();
  }, []);

  const value = {
    backgroundSettings,
    updateBackgroundSettings,
    refreshBackgroundSettings: fetchBackgroundSettings,
    getBackgroundStyle,
    loadGoogleFont,
    applyFontGlobally,
    getFontCategory,
    checkFontAvailability,
    forceRefreshFont,
  };

  return (
    <WtfBackgroundContext.Provider value={value}>
      {children}
    </WtfBackgroundContext.Provider>
  );
};

export default WtfBackgroundContext;
