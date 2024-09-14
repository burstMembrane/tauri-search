import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import useEscape from "./hooks/useEscape";
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"



import "./App.css";


let apps = [
  {
    name: "Calendar",
    description: "A simple calendar app",
    icon: "📅",
  },
  {
    name: "Calculator",
    description: "A simple calculator app",
    icon: "🧮",
  },
  {
    name: "Emoji",
    description: "A simple emoji search app",
    icon: "😀",
  },
  { name: "Files", description: "A simple file manager app", icon: "📁" },
  { name: "Notes", description: "A simple notes app", icon: "📝" },
];

let settings = [
  {
    name: "About",
    description: "About this app",
    icon: "📄",
  },
  {
    name: "Preferences",
    description: "App preferences",
    icon: "⚙️",
  },
  {
    name: "Quit",
    description: "Quit this app",
    icon: "🚪",
  },
]

let websites = [
  {
    name: "GitHub",
    description: "Open GitHub in your browser",
    icon: "🐙",
  },
  {
    name: "Google",
    description: "Open Google in your browser",
    icon: "🔍",
  },
  {
    name: "Twitter",
    description: "Open Twitter in your browser",
    icon: "🐦",
  },
  {
    name: "YouTube",
    description: "Open YouTube in your browser",
    icon: "🎥",
  },
]


type AppInfo = {
  name: string;
  description: string;
  icon: string;
};

import { useState } from "react";

function App() {
  const { setTheme } = useTheme()

  const [inputValue, setInputValue] = useState("");

  const [resultApps, setResultApps] = useState<AppInfo[]>([]);
  useEscape();
  useEffect(() => {
    invoke("init_spotlight_window");
  }, []);

  useEffect(() => {
    appWindow.setSize(new LogicalSize(600, 56));
  }, []);

  useEffect(() => {
    setTheme("dark");
  }, []);

  const handleInputValueChange = (value: string) => {
    setInputValue(value);
    appWindow.setSize(new LogicalSize(600, 56 + 56 * 3));

    let returnedApps = apps.filter((app: AppInfo) => {
      return app.name.toLowerCase().includes(value.toLowerCase());
    }

    );

    setResultApps(returnedApps as AppInfo[]);

  };
  return (


    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="bg-transparent">
        <Command >
          {/* State to track input value */}
          <CommandInput
            className="text-2xl py-0 my-0"
            placeholder="Search"
            value={inputValue || ""}
            // 
            onValueChange={(value) => {
              handleInputValueChange(value);
            }}
          />


          <CommandList>
            <CommandEmpty></CommandEmpty>
            <CommandGroup heading="Apps">
              {resultApps.map((app) => (
                <CommandItem key={app.name}>
                  {app.icon} {app.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Settings">
              {settings.map((setting) => (
                <CommandItem key={setting.name}>
                  {setting.icon} {setting.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Websites">
              {websites.map((website) => (
                <CommandItem key={website.name}>
                  {website.icon} {website.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>


        </Command>
      </div>
    </ThemeProvider>
  );
}

export default App;
