import { THEME_ACCENT_KEY, THEME_MODE_KEY } from "./theme-storage";

/**
 * Applies the stored theme before the first paint.
 *
 * This has to be a blocking inline script: if React applied the class after
 * hydration, a returning dark-mode user would see a white flash. Everything it
 * does is attribute work - the actual colours already exist in the CSS that
 * the server rendered.
 */
const SCRIPT = `(function(){try{
var m=localStorage.getItem(${JSON.stringify(THEME_MODE_KEY)})||"system";
var a=localStorage.getItem(${JSON.stringify(THEME_ACCENT_KEY)})||"ocean";
var d=m==="dark"||(m!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);
var r=document.documentElement;
r.classList.toggle("dark",d);
r.style.colorScheme=d?"dark":"light";
r.setAttribute("data-accent",a);
r.setAttribute("data-theme-mode",m);
}catch(e){}})();`;

export function ThemeScript() {
  return (
    <script
      id="md-theme-script"
      // Static, self-authored source with no interpolated user data.
      dangerouslySetInnerHTML={{ __html: SCRIPT }}
    />
  );
}
