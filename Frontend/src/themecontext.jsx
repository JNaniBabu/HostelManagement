import { createContext, useState, useEffect } from "react";

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {

  const [theme,setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(()=>{

    document.documentElement.setAttribute("data-theme",theme);
    localStorage.setItem("theme",theme);

  },[theme]);

  return(
    <ThemeContext.Provider value={{theme,setTheme}}>
      {children}
    </ThemeContext.Provider>
  )
}