import { useContext } from "react";

import { ThemeContext } from "../themecontext";

function ThemeSelector() {
  const { theme, setTheme } = useContext(ThemeContext);

  const themeOptions = [
    {
      id: "light",
      label: "Light",
      description: "Bright, clean, and clear for daytime use.",
    },
    {
      id: "dark",
      label: "Dark",
      description: "Comfortable contrast for low-light sessions.",
    },
    {
      id: "blue",
      label: "Blue",
      description: "A focused dashboard-style blue interface.",
    },
  ];

  return (
    <div className="Themecontainer">
      <div className="themeHero">
        <h3>Theme Preferences</h3>
        <p className="themeSubtitle">
          Choose the look and feel that best fits your workspace.
        </p>
      </div>

      <div className="Themsub">
        <h3>Choose your preferred theme</h3>
        <div className="themebuttons">
          {themeOptions.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={`themeOption themeOption-${item.id} ${
                theme === item.id ? "themeOptionActive" : ""
              }`}
            >
              <span className="themeOptionLabel">{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="theminstructions">
        <h4 className="themeGuideTitle">Theme Settings Guide</h4>
        <p className="themeGuideIntro">
          Themes allow you to change the look and feel of your dashboard. You
          can choose a theme that is comfortable for your eyes and suits your
          working style.
        </p>

        <div className="themeGuideItem">
          <h5>Light Theme</h5>
          <p>
            Bright background with high readability. Great for daytime and
            well-lit environments.
          </p>
        </div>

        <div className="themeGuideItem">
          <h5>Dark Theme</h5>
          <p>
            Lower brightness and stronger contrast to reduce eye strain during
            long evening sessions.
          </p>
        </div>

        <div className="themeGuideItem">
          <h5>Blue Theme</h5>
          <p>
            Clean professional blue palette that works well for focused
            dashboard workflows.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ThemeSelector;
