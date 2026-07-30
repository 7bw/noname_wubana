import { lib, game, ui, get, ai, _status } from "noname";
import * as group1 from "./parts/group1.js";
import * as group2 from "./parts/group2.js";
import * as group3 from "./parts/group3.js";
import * as group4 from "./parts/group4.js";
import * as group5 from "./parts/group5.js";
import * as group6 from "./parts/group6.js";
import * as group7 from "./parts/group7.js";
import * as group8 from "./parts/group8.js";
import * as group9 from "./parts/group9.js";
import * as group10 from "./parts/group10.js";

const groups = [group1, group2, group3, group4, group5, group6, group7, group8, group9, group10];

// 新增势力：研(yan) / 工(gong) / 游(you) / 师(shi) / 学(xue)，以及“调班”动态转换的 阳(yang) / 阴(yin)
// 注：神(shen) 势力复用引擎自带的 shen 分组，无需在此注册。
const wubanaGroups = {
	yan: { name: "研", nature: "thunder" },
	gong: { name: "工", nature: "wood" },
	you: { name: "游", nature: "water" },
	shi: { name: "师", nature: "soil" },
	xue: { name: "学", nature: "qun" },
	yang: { name: "阳", nature: "fire" },
	yin: { name: "阴", nature: "shen" },
};
function registerWubanaGroups() {
	for (const id in wubanaGroups) {
		const { name, nature } = wubanaGroups[id];
		if (!lib.group.includes(id)) {
			lib.group.add(id);
		}
		lib.translate[id] = name;
		lib.translate[`${id}2`] = name;
		lib.translate[`group_${id}`] = `${name}势力`;
		lib.translate[`group_${id}_bg`] = name;
		lib.groupnature[id] = nature;
	}
}

// 合并各分组导出的武将、技能与翻译
const character = Object.assign({}, ...groups.map(g => g.character));
const skill = Object.assign({}, ...groups.map(g => g.skill));
const translate = Object.assign({}, ...groups.map(g => g.translate));
// 扩展标识用 ASCII "wubana"（安卓资源打包会丢弃非 ASCII 目录名），显示名仍为"五班阿"
translate.wubana = "五班阿";

export const type = "extension";

export default function () {
	return {
		name: "wubana",
		editable: false,
		connect: true,
		content() {
			registerWubanaGroups();
		},
		precontent() {
			registerWubanaGroups();
		},
		config: {},
		help: {},
		package: {
			character: {
				character,
				skill,
				translate,
				connect: true,
			},
			intro: "五班同学主题DIY武将扩展，包含研/工/游/神/师/学六个自定义势力，共57名武将。",
			author: "五班",
			diskURL: "",
			forumURL: "",
			version: "1.3.1",
		},
		files: { character: [], card: [], skill: [], audio: [] },
	};
}
