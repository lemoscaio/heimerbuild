import type {
	AbilitySlot,
	Champion,
	ChampionAbilities,
	ChampionSpell,
	SkillRules,
} from "@schemas/champion"

type ChampionOptions = {
	maxRanks?: [number, number, number, number]
	skillRules?: SkillRules
	recommendedOrder?: ChampionAbilities["recommendedOrder"]
}

function spell(slot: AbilitySlot, maxRank: number): ChampionSpell {
	return {
		slot,
		name: `${slot} ability`,
		description: "",
		icon: `https://example.test/${slot}.png`,
		maxRank,
		cooldown: Array.from({ length: maxRank }, () => 10),
		rankValues: [],
	}
}

/** A champion with only what the skill rules read; the default is a standard 5/5/5/3 champion. */
export function skillChampion({
	maxRanks = [5, 5, 5, 3],
	skillRules,
	recommendedOrder,
}: ChampionOptions = {}): Pick<Champion, "key" | "abilities" | "skillRules"> {
	const [q, w, e, r] = maxRanks
	return {
		key: "Test",
		abilities: {
			passive: {
				name: "Passive",
				description: "",
				icon: "https://example.test/p.png",
			},
			spells: [spell("Q", q), spell("W", w), spell("E", e), spell("R", r)],
			...(recommendedOrder ? { recommendedOrder } : {}),
		},
		...(skillRules ? { skillRules } : {}),
	}
}

/** Teemo on 16.19.1: Riot suggests E Q W E first, then maxing R > E > Q > W. */
export const TEEMO_ORDER = {
	firstPoints: ["E", "Q", "W", "E"],
	priority: ["R", "E", "Q", "W"],
} as const satisfies ChampionAbilities["recommendedOrder"]
