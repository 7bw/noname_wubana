import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 五班阿扩展 —— 第三组：神（god）武将
 * 神李博为、神徐家澍、神黄彦瑞、神宋轶健、神杜时宇
 */

// 模块级辅助：返回某武将牌上可被“声明/获得”的技能（排除限定技/觉醒技/主公技）
function wbaDeclarableSkills(name, player) {
	const skills = get.character(name, 3) || [];
	return skills.filter(s => {
		if (!lib.skill[s]) {
			return false;
		}
		const cats = get.skillCategoriesOf(s, player);
		return !cats.some(c => c === "限定技" || c === "觉醒技" || c === "主公技");
	});
}

export const character = {
	wba_shen_libowei: { sex: "male", group: "shen", hp: 5, skills: ["wba_chuangzuo", "wba_huaijiu", "wba_kaishiba"] },
	wba_shen_xujiashu: { sex: "male", group: "shen", hp: 5, skills: ["wba_zhuanxue", "wba_xiaxiao"] },
	wba_shen_huangyanrui: { sex: "male", group: "shen", hp: 5, skills: ["wba_jiejian", "wba_fangjian", "wba_jiaoyou"] },
	wba_shen_songyijian: { sex: "male", group: "shen", hp: 5, skills: ["wba_moyu", "wba_jiaban", "wba_bailan"] },
	wba_shen_dushiyu: { sex: "male", group: "shen", hp: 5, skills: ["wba_qicai", "wba_nuojiang"] },
};

export const skill = {
	/* ============ 神李博为 ============ */
	// 创作：游戏开始时随机获得两张武将牌并亮出其一，获得其一个技能且性别势力视为相同；
	// 回合开始时或结束后可更改亮出的“化身”并重新声明一个技能。（自包含的简化“化身”）
	wba_chuangzuo: {
		trigger: { player: ["enterGame", "phaseBegin", "phaseAfter"], global: "gameStart" },
		direct: true,
		// 亮出一张“化身”并声明一个技能，同时把性别/势力视为与其相同
		async reveal(player) {
			const list = player.storage.wba_huashen || [];
			if (!list.length) {
				return;
			}
			let current = list[0];
			if (list.length > 1) {
				const r = await player
					.chooseButton(["创作：选择要亮出的“化身”牌", [list, "character"]], true)
					.set("ai", () => Math.random())
					.forResult();
				if (r && r.bool && r.links && r.links.length) {
					current = r.links[0];
				}
			}
			player.storage.wba_huashen_current = current;
			game.log(player, "亮出了“化身”", "#g" + get.translation(current));
			// 视觉上把武将立绘替换为“化身”武将（还原左慈式化身体验）
			player.flashAvatar("wba_chuangzuo", current);
			// 声明一个技能（替换先前声明的技能）
			const skills = wbaDeclarableSkills(current, player);
			let declared = null;
			if (skills.length === 1) {
				declared = skills[0];
			} else if (skills.length > 1) {
				const r2 = await player
					.chooseButton(["创作：声明一个技能", [skills, "skill"]], true)
					.set("ai", () => Math.random())
					.forResult();
				if (r2 && r2.bool && r2.links && r2.links.length) {
					declared = r2.links[0];
				} else {
					declared = skills.randomGet();
				}
			}
			if (declared) {
				await player.addAdditionalSkills("wba_chuangzuo", declared);
			}
			// 性别与势力视为与“化身”相同
			const char = get.character(current);
			if (char && !char.isNull) {
				const sex = char.sex;
				const group = char.group;
				game.broadcastAll(
					(p, sex, group) => {
						if (sex) {
							p.sex = sex;
						}
						if (group) {
							p.group = group;
							if (p.node && p.node.name) {
								p.node.name.dataset.nature = get.groupnature(group);
							}
						}
					},
					player,
					sex,
					group
				);
				game.log(player, "的性别与势力视为与", "#g" + get.translation(current), "相同");
			}
			player.markSkill("wba_chuangzuo");
		},
		async content(event, trigger, player) {
			const info = get.info("wba_chuangzuo");
			const tn = event.triggername;
			if (tn === "enterGame" || tn === "gameStart") {
				// 游戏开始时初始化（去重，避免 enterGame 与 gameStart 重复触发）
				if (player.storage.wba_chuangzuo_inited) {
					return;
				}
				player.storage.wba_chuangzuo_inited = true;
				if (!Array.isArray(player.storage.wba_huashen)) {
					player.storage.wba_huashen = [];
				}
				const pool = get.gainableCharacters(true).filter(name => wbaDeclarableSkills(name, player).length > 0);
				if (!pool.length) {
					return;
				}
				pool.randomSort();
				const gains = pool.slice(0, 2);
				player.storage.wba_huashen.addArray(gains);
				if (typeof player.syncStorage === "function") {
					player.syncStorage("wba_huashen");
				}
				player.logSkill("wba_chuangzuo");
				game.log(player, "获得了", get.cnNumber(gains.length) + "张", "#g“化身”牌");
				await info.reveal(player);
				return;
			}
			// 回合开始时/结束后：可以更改
			if (!player.storage.wba_huashen || !player.storage.wba_huashen.length) {
				return;
			}
			const r = await player
				.chooseBool("创作：是否更改亮出的“化身”牌并重新声明一个技能？")
				.set("ai", () => false)
				.forResult();
			if (!r || !r.bool) {
				return;
			}
			player.logSkill("wba_chuangzuo");
			await info.reveal(player);
		},
		intro: {
			markcount(storage, player) {
				return player && player.storage.wba_huashen ? player.storage.wba_huashen.length : 0;
			},
			content(storage, player) {
				const list = (player && player.storage.wba_huashen) || [];
				let str = list.length ? "拥有的“化身”：" + list.map(n => get.translation(n)).join("、") : "没有“化身”牌";
				if (player && player.storage.wba_huashen_current) {
					str += "<br>当前亮出：" + get.translation(player.storage.wba_huashen_current);
				}
				return str;
			},
		},
	},
	// 怀旧：锁定技，失去体力/受到伤害后获得一张新“化身”牌；手牌上限恒定为 X+1（X为化身数）
	wba_huaijiu: {
		trigger: { player: ["loseHpAfter", "damageEnd"] },
		forced: true,
		locked: true,
		async content(event, trigger, player) {
			if (!Array.isArray(player.storage.wba_huashen)) {
				player.storage.wba_huashen = [];
			}
			const pool = get.gainableCharacters(true).filter(name => {
				if (player.storage.wba_huashen.includes(name)) {
					return false;
				}
				return wbaDeclarableSkills(name, player).length > 0;
			});
			if (!pool.length) {
				return;
			}
			const gain = pool.randomGet();
			player.storage.wba_huashen.add(gain);
			if (typeof player.syncStorage === "function") {
				player.syncStorage("wba_huashen");
			}
			game.log(player, "获得了一张新的“化身”牌");
			player.markSkill("wba_chuangzuo");
		},
		mod: {
			maxHandcard(player, num) {
				const x = Array.isArray(player.storage.wba_huashen) ? player.storage.wba_huashen.length : 0;
				return x + 1;
			},
		},
	},
	// 开始吧：锁定技，结束阶段摸一张牌
	wba_kaishiba: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		locked: true,
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	/* ============ 神徐家澍 ============ */
	// 转学：出牌阶段限一次，弃置任意张牌然后摸等量的牌；若弃置的牌包括你所有手牌，多摸一张
	wba_zhuanxue: {
		enable: "phaseUse",
		usable: 1,
		filterCard: true,
		selectCard: [1, Infinity],
		position: "he",
		discard: false,
		lose: false,
		filter(event, player) {
			return player.countCards("he") > 0;
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const cards = event.cards.slice(0);
			const handCount = player.countCards("h");
			const discardedHand = cards.filter(c => get.position(c) === "h").length;
			const allHand = handCount > 0 && discardedHand >= handCount;
			await player.discard(cards);
			let num = cards.length;
			if (allHand) {
				num++;
				game.log(player, "弃置了所有手牌，额外摸一张牌");
			}
			await player.draw(num);
		},
		ai: {
			order: 2,
			result: { player: 1 },
		},
	},
	// 夏校：结束阶段，若本回合打出/使用的手牌花色数 > 体力值，可选择一项
	wba_xiaxiao: {
		trigger: { player: "phaseJieshuBegin" },
		// 统计本回合因使用/打出而失去的手牌花色集合
		getSuits(player) {
			const suits = [];
			player.checkHistory("lose", evt => {
				const par = evt.relatedEvent || evt.getParent();
				if (!par || (par.name !== "useCard" && par.name !== "respond")) {
					return;
				}
				const hs = evt.hs || [];
				for (const card of hs) {
					const s = get.suit(card, player);
					if (lib.suit.includes(s) && !suits.includes(s)) {
						suits.push(s);
					}
				}
			});
			return suits;
		},
		filter(event, player) {
			return get.info("wba_xiaxiao").getSuits(player).length > player.getHp();
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_xiaxiao"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const hasRed = player.hasCard(c => get.color(c) === "red", "h");
			let index = 0;
			if (hasRed) {
				const r = await player
					.chooseControl("摸四张牌并将武将牌翻面", "弃置一张红色手牌并回复一点体力")
					.set("prompt", "夏校：请选择一项")
					.set("ai", () => (player.isDamaged() ? 1 : 0))
					.forResult();
				index = r.index;
			}
			if (index === 1) {
				const r2 = await player.chooseToDiscard(1, "h", { color: "red" }, true).forResult();
				if (r2 && r2.bool) {
					await player.recover();
				}
			} else {
				await player.draw(4);
				await player.turnOver();
			}
		},
	},

	/* ============ 神黄彦瑞 ============ */
	// 借箭：被其他角色单独指定为一张牌的目标时，可判定：红色→置为“箭”；梅花→摸牌；黑桃→可使该牌对你无效
	wba_jiejian: {
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (event.player === player) {
				return false;
			}
			const parent = event.getParent();
			return parent && Array.isArray(parent.targets) && parent.targets.length === 1 && event.target === player;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_jiejian"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const judgeEvent = player.judge(card => {
				if (get.color(card) === "red") {
					return 3;
				}
				if (get.suit(card) === "club") {
					return 2;
				}
				return 1;
			});
			// 红色：将判定牌置于武将牌上称为“箭”
			judgeEvent.set("callback", async judge => {
				if (judge.judgeResult && judge.judgeResult.color === "red" && get.position(judge.card, true) === "o") {
					const next = player.addToExpansion(judge.card, player, "give");
					next.gaintag.add("wba_jian");
					await next;
					player.markSkill("wba_jiejian");
					game.log(player, "将判定牌置于武将牌上，称为", "#g“箭”");
				}
			});
			const result = await judgeEvent.forResult();
			const card = result && result.card;
			if (!card) {
				return;
			}
			const suit = get.suit(card, player);
			if (suit === "club") {
				await player.draw();
			} else if (suit === "spade") {
				const parent = trigger.getParent();
				if (parent && Array.isArray(parent.targets)) {
					parent.targets.remove(player);
				}
				if (Array.isArray(trigger.targets)) {
					trigger.targets.remove(player);
				}
				game.log(trigger.card, "对", player, "无效");
			}
		},
		onremove(player, skill) {
			const cards = player.getExpansions("wba_jian");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		intro: {
			markcount(storage, player) {
				return player.getExpansions("wba_jian").length;
			},
			content(storage, player) {
				const cards = player.getExpansions("wba_jian");
				return cards.length ? "武将牌上有" + get.cnNumber(cards.length) + "张“箭”" : "没有“箭”";
			},
		},
	},
	// 放箭：出牌阶段，可将任意数量的“箭”当作万箭齐发使用
	wba_fangjian: {
		enable: "phaseUse",
		filter(event, player) {
			return player.getExpansions("wba_jian").length > 0 && game.hasPlayer(cur => cur !== player);
		},
		async content(event, trigger, player) {
			const jian = player.getExpansions("wba_jian");
			const r = await player
				.chooseButton(["放箭：将任意数量的“箭”当作【万箭齐发】使用", jian], [1, jian.length])
				.set("ai", () => 1 + Math.random())
				.forResult();
			if (!r || !r.bool || !r.links || !r.links.length) {
				return;
			}
			const chosen = r.links;
			const card = get.autoViewAs({ name: "wanjian", isCard: true }, chosen);
			const targets = game.filterPlayer(cur => cur !== player);
			await player.useCard({ card, cards: chosen, targets });
		},
		ai: {
			order: 6,
			result: { player: 1 },
		},
	},
	// 跤友：锁定技，当你武将牌上没有“箭”时，男性角色对你、你对男性角色造成的伤害均+1
	wba_jiaoyou: {
		trigger: { player: "damageBegin1", source: "damageBegin1" },
		forced: true,
		locked: true,
		filter(event, player) {
			if (player.getExpansions("wba_jian").length !== 0) {
				return false;
			}
			// 你是受伤者：伤害来源为男性
			if (event.player === player) {
				return event.source && event.source !== player && event.source.sex === "male";
			}
			// 你是来源：受伤者为男性
			if (event.source === player) {
				return event.player !== player && event.player.sex === "male";
			}
			return false;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	/* ============ 神宋轶健 ============ */
	// 摸鱼：手牌/体力/装备为全场最多时，可分别跳过摸牌/出牌/弃牌阶段（记录跳过阶段数供加班使用）
	wba_moyu: {
		trigger: { player: ["phaseBegin", "phaseDrawBefore", "phaseUseBefore", "phaseDiscardBefore"] },
		direct: true,
		filter(event, player) {
			const tn = event.triggername;
			if (tn === "phaseBegin") {
				return true;
			}
			if (tn === "phaseDrawBefore") {
				return !game.hasPlayer(cur => cur !== player && cur.countCards("h") > player.countCards("h"));
			}
			if (tn === "phaseUseBefore") {
				return !game.hasPlayer(cur => cur !== player && cur.getHp() > player.getHp());
			}
			if (tn === "phaseDiscardBefore") {
				return player.countCards("e") > 0 && !game.hasPlayer(cur => cur !== player && cur.countCards("e") > player.countCards("e"));
			}
			return false;
		},
		async content(event, trigger, player) {
			const tn = event.triggername;
			if (tn === "phaseBegin") {
				player.storage.wba_moyu_skip = 0;
				return;
			}
			const map = { phaseDrawBefore: "摸牌阶段", phaseUseBefore: "出牌阶段", phaseDiscardBefore: "弃牌阶段" };
			const r = await player
				.chooseBool("摸鱼：是否跳过" + map[tn] + "？")
				.set("ai", () => false)
				.forResult();
			if (r && r.bool) {
				player.logSkill("wba_moyu");
				trigger.cancel();
				player.storage.wba_moyu_skip = (player.storage.wba_moyu_skip || 0) + 1;
				game.log(player, "跳过了", "#y" + map[tn]);
			}
		},
	},
	// 加班：结束阶段，可选一项：1.摸X张牌；2.从至多X名角色手牌各抽一张。之后进行一个额外的出牌阶段
	wba_jiaban: {
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_jiaban"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const X = player.storage.wba_moyu_skip || 0;
			let index = 0;
			if (X > 0) {
				const r = await player
					.chooseControl("摸" + X + "张牌", "从至多" + X + "名角色手牌中各抽取一张牌")
					.set("prompt", "加班：请选择一项")
					.set("ai", () => 0)
					.forResult();
				index = r.index;
			}
			if (index === 0) {
				if (X > 0) {
					await player.draw(X);
				}
			} else {
				const r2 = await player
					.chooseTarget("加班：从至多" + X + "名角色的手牌中各抽取一张牌", (card, p, target) => target !== p && target.countCards("h") > 0)
					.set("selectTarget", [1, X])
					.set("ai", target => (get.attitude(player, target) < 0 ? 1 + target.countCards("h") : 0.1))
					.forResult();
				if (r2 && r2.bool && r2.targets && r2.targets.length) {
					const targets = r2.targets.slice(0).sortBySeat();
					player.line(targets);
					for (const target of targets) {
						if (target.countCards("h") > 0) {
							await player.gainPlayerCard(target, "h", true);
						}
					}
				}
			}
			// 额外的出牌阶段
			const evt = trigger.getParent("phase");
			if (evt && Array.isArray(evt.phaseList) && typeof evt.num === "number") {
				evt.phaseList.splice(evt.num + 1, 0, "phaseUse|" + event.name);
			} else {
				await player.phaseUse();
			}
		},
	},
	// 摆烂：结束阶段，若本回合未跳过任一阶段，可视为对一名角色使用一张无距离限制的杀
	wba_bailan: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			if (player.storage.wba_moyu_skip) {
				return false;
			}
			return game.hasPlayer(cur => player.canUse({ name: "sha", isCard: true }, cur, false));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_bailan"), (card, p, target) => p.canUse({ name: "sha", isCard: true }, target, false))
				.set("ai", target => get.effect(target, { name: "sha", isCard: true }, player, player))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			await player.useCard({ name: "sha", isCard: true }, target, false);
		},
	},

	/* ============ 神杜时宇 ============ */
	// 奇才：可将任意黑色牌当无懈可击、任意红色牌当无中生有使用，每轮均限一次
	wba_qicai: {
		group: ["wba_qicai_wuxie", "wba_qicai_wuzhong"],
	},
	wba_qicai_wuxie: {
		enable: "chooseToUse",
		viewAs: { name: "wuxie" },
		filterCard(card) {
			return get.color(card) === "black";
		},
		position: "he",
		round: 1,
		viewAsFilter(player) {
			return player.hasCard(c => get.color(c) === "black", "he");
		},
		prompt: "将一张黑色牌当【无懈可击】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			order: 1,
			expose: 0.2,
		},
	},
	wba_qicai_wuzhong: {
		enable: "phaseUse",
		viewAs: { name: "wuzhong" },
		filterCard(card) {
			return get.color(card) === "red";
		},
		position: "he",
		round: 1,
		viewAsFilter(player) {
			return player.hasCard(c => get.color(c) === "red", "he");
		},
		prompt: "将一张红色牌当【无中生有】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: {
			order: 9,
			result: { player: 1 },
		},
	},
	// 诺奖：其他角色结束阶段，若你本回合未成为过其使用牌的目标则摸一张；否则可弃X张牌对其造成1点伤害
	wba_nuojiang: {
		trigger: { global: "phaseJieshuBegin" },
		direct: true,
		filter(event, player) {
			return event.player !== player;
		},
		async content(event, trigger, player) {
			// X = 本回合你成为其使用牌目标的次数
			const X = game.getGlobalHistory("useCard", evt => evt.player === trigger.player && Array.isArray(evt.targets) && evt.targets.includes(player)).length;
			if (X <= 0) {
				player.logSkill("wba_nuojiang");
				await player.draw();
				return;
			}
			if (player.countCards("he") < X) {
				return;
			}
			const r = await player
				.chooseBool("诺奖：是否弃置" + X + "张牌，对" + get.translation(trigger.player) + "造成1点伤害？")
				.set("ai", () => get.damageEffect(trigger.player, player, player) > 0)
				.forResult();
			if (r && r.bool) {
				player.logSkill("wba_nuojiang", trigger.player);
				const r2 = await player.chooseToDiscard(X, "he", true).forResult();
				if (r2 && r2.bool) {
					await trigger.player.damage(player);
				}
			}
		},
	},
};

export const translate = {
	/* 武将名 */
	wba_shen_libowei: "神李博为",
	wba_shen_xujiashu: "神徐家澍",
	wba_shen_huangyanrui: "神黄彦瑞",
	wba_shen_songyijian: "神宋轶健",
	wba_shen_dushiyu: "神杜时宇",

	/* 技能 */
	wba_chuangzuo: "创作",
	wba_chuangzuo_info: "游戏开始时，你随机获得两张武将牌，然后亮出其中一张。你获得亮出的“化身”牌的一个技能，且性别和势力视为与“化身”牌相同。回合开始时或结束后，你可以更改亮出的“化身”牌，并重新声明一个技能。（不能声明限定技、觉醒技或主公技）",
	wba_huaijiu: "怀旧",
	wba_huaijiu_info: "锁定技，当你失去一点体力或受到伤害后，你获得一张新的“化身”牌。你的手牌上限恒定为X+1（X为你拥有的“化身”牌的数量）。",
	wba_kaishiba: "开始吧",
	wba_kaishiba_info: "锁定技，结束阶段，你摸一张牌。",

	wba_zhuanxue: "转学",
	wba_zhuanxue_info: "出牌阶段限一次，你可以弃置任意张牌，然后摸等量的牌。若你以此法弃置的牌中包括你的所有手牌，你多摸一张牌。",
	wba_xiaxiao: "夏校",
	wba_xiaxiao_info: "结束阶段，若本回合你打出或使用的手牌花色数量大于你的体力值，则你可以选择一项：1.摸四张牌并将武将牌翻面；2.弃置一张红色花色的手牌并回复一点体力。",

	wba_jiejian: "借箭",
	wba_jiejian_info: "每当你被其他角色单独指定为一张牌的目标时，你可以进行一次判定：若结果为红色，你将判定牌置于武将牌上，称为“箭”；若为梅花，你摸一张牌；若为黑桃，你可以使这张以你为目标的牌对你无效。",
	wba_fangjian: "放箭",
	wba_fangjian_info: "出牌阶段，你可以将任意数量的“箭”当作【万箭齐发】使用。",
	wba_jiaoyou: "跤友",
	wba_jiaoyou_info: "锁定技，当你的武将牌上没有“箭”时，男性角色对你、你对男性角色造成的伤害均加一。",

	wba_moyu: "摸鱼",
	wba_moyu_info: "若你的手牌数为全场最多，你可以跳过摸牌阶段；若你的体力值为全场最多，你可以跳过出牌阶段；若你的装备区里有牌且数量为全场最多，你可以跳过弃牌阶段。",
	wba_jiaban: "加班",
	wba_jiaban_info: "回合结束阶段，你可以选择一项：1.摸X张牌；2.从至多X名角色手牌中各抽取一张牌；（X为本回合内你跳过的阶段数量），之后你进行一个额外的出牌阶段。",
	wba_bailan: "摆烂",
	wba_bailan_info: "结束阶段，若本回合你没有跳过任一阶段，你可以选择一名角色，视为对其使用一张无距离限制的杀。",

	wba_qicai: "奇才",
	wba_qicai_info: "你可以将任意黑色牌当作【无懈可击】使用，将任意红色牌当作【无中生有】使用，每轮均限一次。",
	wba_qicai_wuxie: "奇才",
	wba_qicai_wuxie_info: "每轮限一次，你可以将任意黑色牌当作【无懈可击】使用。",
	wba_qicai_wuzhong: "奇才",
	wba_qicai_wuzhong_info: "每轮限一次，你可以将任意红色牌当作【无中生有】使用。",
	wba_nuojiang: "诺奖",
	wba_nuojiang_info: "其他角色的结束阶段，若你本回合未成为过其使用牌的目标，你摸一张牌；否则你可以弃置X张牌对其造成一点伤害（X为你本回合成为其使用牌的目标次数）。",
};
