

export const commandScore = (string: string, abbreviation: string, aliases: string[] = []): number => {
    const SCORE_CONTINUE_MATCH: number = 1;
    const SCORE_SPACE_WORD_JUMP: number = 0.9;
    const SCORE_NON_SPACE_WORD_JUMP: number = 0.8;
    const SCORE_CHARACTER_JUMP: number = 0.17;

    const PENALTY_SKIPPED: number = 0.999;
    const PENALTY_CASE_MISMATCH: number = 0.9999;
    const DELIMITER_REGEXP: RegExp = /[\\\/_+.#"@\[\(\{&]/;
    const IS_SPACE_REGEXP: RegExp = /[\s-]/;

    const lowerString: string = (string + ' ' + aliases.join(' ')).toLowerCase();
    const lowerAbbreviation: string = abbreviation.toLowerCase();

    const score = (stringIndex: number, abbrIndex: number, memo: { [key: string]: number } = {}): number => {
        const memoKey: string = `${stringIndex},${abbrIndex}`;
        // if the score is already calculated, return it
        if (memo[memoKey] !== undefined) return memo[memoKey];

        // if the abbreviation is fully matched, return the score
        if (abbrIndex === abbreviation.length) return stringIndex === string.length ? SCORE_CONTINUE_MATCH : 0.99;

        let highScore: number = 0, index: number = lowerString.indexOf(lowerAbbreviation[abbrIndex], stringIndex);

        while (index >= 0) {
            // recursively calculate the score
            let tempScore = score(index + 1, abbrIndex + 1, memo);
            // calculate the score based on the character match
            tempScore *= index === stringIndex ? SCORE_CONTINUE_MATCH : IS_SPACE_REGEXP.test(string[index - 1]) ? SCORE_SPACE_WORD_JUMP :
                DELIMITER_REGEXP.test(string[index - 1]) ? SCORE_NON_SPACE_WORD_JUMP : SCORE_CHARACTER_JUMP;

            // apply penalty for skipped characters
            if (index > stringIndex) tempScore *= Math.pow(PENALTY_SKIPPED, index - stringIndex);
            // apply penalty for case mismatch
            if (string[index] !== abbreviation[abbrIndex]) tempScore *= PENALTY_CASE_MISMATCH;

            if (tempScore > highScore) highScore = tempScore;
            index = lowerString.indexOf(lowerAbbreviation[abbrIndex], index + 1);
        }
        memo[memoKey] = highScore;
        return highScore;
    };

    return score(0, 0);
}