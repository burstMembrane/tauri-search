import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import useEscape from "./hooks/useEscape";
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { ThemeProvider } from "@/components/theme-provider"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { commandScore } from "./lib/score";

import "./App.css";
// AppReference type mirrored in src-tauri/
type AppReference = {
  name: string,
  icon: string | undefined,
  path: string,
  executable_path: string | undefined,
  icon_base64: string | undefined
}

function filterApps(items: AppReference[], keyword: string): AppReference[] {
  return items
    .map(item => ({ item, score: commandScore(item.name, keyword) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
const setWindowSize = (width: number, height: number) => {
  appWindow.setSize(new LogicalSize(width, height));
}
function App() {

  const [inputValue, setInputValue] = useState("");
  const [apps, setApps] = useState<AppReference[]>([]);

  useEscape();
  useEffect(() => {
    invoke("init_spotlight_window");
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['apps'],
    queryFn: async (): Promise<AppReference[]> => {
      const res = await invoke("get_apps");

      if (!res) return [] as AppReference[];
      // parse JSON
      const data: AppReference[] = JSON.parse(res as string);
      // filter the items for duplicate names
      const uniqueAppNames = new Set<string>();
      const uniqueItems: AppReference[] = data.filter(item => {
        if (uniqueAppNames.has(item.name)) return false;
        uniqueAppNames.add(item.name);
        return true;
      });

      // filter out items that start with /Library or /System
      return uniqueItems.filter(item => !item.path.startsWith("/Library") && !item.path.startsWith("/System"));

    },
  })

  useEffect(() => {
    // todo, set it to the number of items
    setWindowSize(600, 56 + 28 + 44 * Math.min(apps.length, 5));
  }, [apps]);
  useEffect(() => {
    setWindowSize(600, 56);
  }, []);

  const handleInputValueChange = (value: string) => {
    setInputValue(value);

    // if the input is empty, reset the size
    if (value === "") {
      setWindowSize(600, 56);
      return;
    }

    // filter the items by command score
    if (!data) return
    // filter the items by the search ranking
    const filteredItems: AppReference[] = filterApps(data, value);
    setApps(filteredItems);
  };
  return (


    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="bg-transparent flex items-center">
        <Command loop
          className="h-[56px]"
          shouldFilter={false}
        >

          <CommandInput
            className="flex text-2xl "
            placeholder="Search"
            value={inputValue || ""}
            onValueChange={(value) => {
              handleInputValueChange(value);
            }}

          />
          <CommandList>
            <CommandEmpty></CommandEmpty>
            <CommandGroup className="fixed overflow-scroll w-full" heading="Apps">
              {apps && apps.map((app: AppReference) => (
                <CommandItem key={app.name}>
                  <img className="w-8 h-8 mx-2" src={`data:image/png;base64,${app.icon_base64}`} alt={app.name} /> {app.name}

                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </ThemeProvider >
  );
}

export default App;
