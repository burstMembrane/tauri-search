import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import useEscape from "./hooks/useEscape";
import { appWindow, LogicalSize } from '@tauri-apps/api/window';
import { ThemeProvider } from "@/components/theme-provider"
import { useTheme } from "@/components/theme-provider"

import {
  Command,

  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,

} from "@/components/ui/command"



import "./App.css";

type AppReference = {
  name: string,
  icon: string | undefined,
  path: string,
  executable_path: string | undefined,
  icon_base64: string | undefined


}


import { useState } from "react";
import { useQuery } from "@tanstack/react-query";



// Command score function
function commandScore(string, abbreviation, aliases = []) {
  const SCORE_CONTINUE_MATCH = 1,
    SCORE_SPACE_WORD_JUMP = 0.9,
    SCORE_NON_SPACE_WORD_JUMP = 0.8,
    SCORE_CHARACTER_JUMP = 0.17,
    SCORE_TRANSPOSITION = 0.1,
    PENALTY_SKIPPED = 0.999,
    PENALTY_CASE_MISMATCH = 0.9999,
    IS_GAP_REGEXP = /[\\\/_+.#"@\[\(\{&]/,
    IS_SPACE_REGEXP = /[\s-]/;

  const lowerString = (string + ' ' + aliases.join(' ')).toLowerCase();
  const lowerAbbreviation = abbreviation.toLowerCase();

  function score(stringIndex, abbrIndex, memo = {}) {
    const memoKey = `${stringIndex},${abbrIndex}`;
    if (memo[memoKey] !== undefined) return memo[memoKey];
    if (abbrIndex === abbreviation.length) return stringIndex === string.length ? SCORE_CONTINUE_MATCH : 0.99;

    let highScore = 0, index = lowerString.indexOf(lowerAbbreviation[abbrIndex], stringIndex);

    while (index >= 0) {
      let tempScore = score(index + 1, abbrIndex + 1, memo);
      tempScore *= index === stringIndex ? SCORE_CONTINUE_MATCH : IS_SPACE_REGEXP.test(string[index - 1]) ? SCORE_SPACE_WORD_JUMP :
        IS_GAP_REGEXP.test(string[index - 1]) ? SCORE_NON_SPACE_WORD_JUMP : SCORE_CHARACTER_JUMP;

      if (index > stringIndex) tempScore *= Math.pow(PENALTY_SKIPPED, index - stringIndex);
      if (string[index] !== abbreviation[abbrIndex]) tempScore *= PENALTY_CASE_MISMATCH;

      if (tempScore > highScore) highScore = tempScore;
      index = lowerString.indexOf(lowerAbbreviation[abbrIndex], index + 1);
    }
    memo[memoKey] = highScore;
    return highScore;
  }

  return score(0, 0);
}

function filterItems(items, keyword) {
  return items
    .map(item => ({ item, score: commandScore(item.name, keyword) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}



function App() {
  const { setTheme } = useTheme()

  const [inputValue, setInputValue] = useState("");

  const [apps, setApps] = useState<AppReference[]>([]);
  useEscape();
  useEffect(() => {
    invoke("init_spotlight_window");
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const res = await invoke("get_apps");
      // parse JSON
      const data = JSON.parse(res as string);

      // filter dupes
      const uniqueData = data.filter((v: AppReference, i: number, a: AppReference[]) => a.findIndex(t => (t.name === v.name)) === i);
      return uniqueData as AppReference[];
    },
  })

  useEffect(() => {
    appWindow.setSize(new LogicalSize(600, 56));
  }, []);

  const handleInputValueChange = (value: string) => {
    setInputValue(value);
    if (value === "") {
      appWindow.setSize(new LogicalSize(600, 56));
      return;
    }

    // filter the items by command score
    const filteredItems = filterItems(apps, value);
    setApps(filteredItems);

    // todo, set it to the number of items
    appWindow.setSize(new LogicalSize(600, 48 + 48 * 5.1));


  };
  return (


    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="bg-transparent flex items-center">
        <Command loop
          className="h-[56px]"

        >
          <CommandInput
            className="flex text-2xl items-center justify-center"
            placeholder="Search"
            value={inputValue || ""}
            onValueChange={(value) => {
              handleInputValueChange(value);
            }}
          />
          <CommandList>
            <CommandEmpty></CommandEmpty>
            <CommandGroup className="fixed overflow-scroll w-full" heading="Apps">
              {data && data.map((app: AppReference) => (
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
