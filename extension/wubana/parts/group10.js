import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 五班阿扩展 —— 第十组：原创/整活武将
 * 刘子平、装逼狂魔·高雯、中路杀神·许盛杰、赤脚大仙·杜时宇、非洲皇帝·刘阳河、斗战胜佛·何智昭
 * 注：wba_liuziping / wba_zhuangbi / wba_tuoxie / wba_foxin 这几个名字已被其它分组的武将/技能占用，
 * 本组对应技能改用 wba_liuziping_dream / wba_gaowen_zhuangbi / wba_dushiyu_tuoxie / wba_hezhizhao_foxin 以避免命名冲突。
 */

export const character = {
	wba_liuziping_dream: { sex: "male", group: "xue", hp: 3, skills: ["wba_dxz", "wba_zmjz", "wba_jingxing"] },
	wba_zbkm_gaowen: { sex: "female", group: "shen", hp: 4, skills: ["wba_gaowen_zhuangbi"] },
	wba_zlss_xushengjie: { sex: "male", group: "shen", hp: 4, skills: ["wba_qiyu", "wba_yuzhi"] },
	wba_cjdx_dushiyu: { sex: "male", group: "shen", hp: 4, skills: ["wba_dushiyu_tuoxie", "wba_chijiao", "wba_jiaoqi"] },
	wba_fzhd_liuyanghe: { sex: "male", group: "shen", hp: 5, skills: ["wba_chongdianbao", "wba_feizhouxuetong"] },
	wba_dzsf_hezhizhao: { sex: "male", group: "shen", hp: 4, skills: ["wba_hezhizhao_foxin", "wba_foguangpuzhao"] },
};

export const skill = {
	/* ============ 刘子平 ============ */
	// 打响指：回合结束阶段，你打一个响指，指定一名其他角色并扰乱他，该角色下一回合摸牌阶段少摸一张牌。
	wba_dxz: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_dxz"), lib.filter.notMe)
				.set("ai", target => -get.attitude(player, target))
				.forResult();
		},
		logTarget: "targets",
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "thunder");
			target.addTempSkill("wba_dxz_jitter");
			game.log(player, "打了一个响指，扰乱了", target);
		},
	},
	wba_dxz_jitter: {
		charlotte: true,
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		popup: false,
		filter(event, player) {
			return !event.numFixed && event.num > 0;
		},
		async content(event, trigger, player) {
			trigger.num--;
			player.removeSkill("wba_dxz_jitter");
		},
		intro: { content: "下个摸牌阶段少摸一张牌" },
	},
	// 在梦境中：摸牌阶段，你可以额外摸两张牌，并将这两张牌分配给任意角色。
	wba_zmjz: {
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_zmjz"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			player.storage.wba_zmjz_used = true;
			player.markSkill("wba_jingxing");
			const result = await player.draw(2).forResult();
			const cards = (result && result.cards) || [];
			for (const card of cards) {
				if (!player.getCards("h").includes(card)) {
					continue;
				}
				const r = await player
					.chooseTarget("在梦境中：将" + get.translation(card) + "分配给一名角色", true)
					.set("ai", target => get.attitude(player, target))
					.forResult();
				if (r && r.bool && r.targets && r.targets.length && r.targets[0] !== player) {
					await player.give(card, r.targets[0]);
				}
			}
		},
	},
	// 惊醒：锁定技，回合结束阶段，若你于本回合发动过“在梦境中”，则你将武将牌翻面。
	wba_jingxing: {
		locked: true,
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return !!player.storage.wba_zmjz_used;
		},
		async content(event, trigger, player) {
			delete player.storage.wba_zmjz_used;
			await player.turnOver();
		},
	},

	/* ============ 装逼狂魔·高雯 ============ */
	// 装逼：每当你造成一点伤害时，你可以进行一次判定，若结果不为红桃，则将判定牌置于你的角色牌上，称为“逼”。
	// 你的“逼”数量每加一，你与其它角色攻击距离减一。当你的“逼”达到三张或更多时，你须减一点体力上限，并永久获得技能“我从来不装逼”。
	wba_gaowen_zhuangbi: {
		trigger: { source: "damageSource" },
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_gaowen_zhuangbi"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const judge = player.judge(card => (get.suit(card, player) === "heart" ? -1 : 1));
			judge.set("callback", async judgeEvt => {
				if (!judgeEvt.judgeResult || get.suit(judgeEvt.judgeResult, player) === "heart" || get.position(judgeEvt.card, true) !== "o") {
					return;
				}
				const next = player.addToExpansion(judgeEvt.card, player, "give");
				next.gaintag.add("wba_bi");
				await next;
				player.markSkill("wba_gaowen_zhuangbi");
				const count = player.getExpansions("wba_bi").length;
				game.log(player, "获得了一张", "#g“逼”", "，当前共有", count, "张");
				if (count >= 3 && !player.storage.wba_gaowen_zhuangbi_awaken) {
					player.storage.wba_gaowen_zhuangbi_awaken = true;
					await player.loseMaxHp();
					await player.addSkills("wba_cclbzb");
				}
			});
			await judge.forResult();
		},
		mod: {
			globalFrom(from, to, distance) {
				const cnt = from.getExpansions("wba_bi").length;
				if (cnt) {
					return distance - cnt;
				}
			},
		},
		intro: {
			markcount(storage, player) {
				return player.getExpansions("wba_bi").length;
			},
			content(storage, player) {
				const n = player.getExpansions("wba_bi").length;
				return n ? "角色牌上有" + get.cnNumber(n) + "张“逼”，与其它角色攻击距离-" + n : "没有“逼”";
			},
		},
	},
	// 我从来不装逼：你可以将“逼”置于其它角色的角色牌上，若如此做，当你受到来自该角色的伤害时，该角色需弃置X张牌（X为其角色牌上“逼”的数量）。
	wba_cclbzb: {
		enable: "phaseUse",
		group: ["wba_cclbzb_effect"],
		filter(event, player) {
			return player.getExpansions("wba_bi").length > 0 && game.hasPlayer(cur => cur !== player);
		},
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const cards = player.getExpansions("wba_bi");
			if (!cards.length) {
				return;
			}
			const card = cards[cards.length - 1];
			const next = target.addToExpansion([card], player, "give");
			next.gaintag.add("wba_bi");
			await next;
			game.log(player, "将一张", "#g“逼”", "置于", target, "的角色牌上");
		},
		ai: { order: 3, result: { target: -1 } },
		subSkill: {
			effect: {
				charlotte: true,
				locked: true,
				trigger: { player: "damageEnd" },
				forced: true,
				filter(event, player) {
					return !!(event.source && event.source !== player && event.source.isIn() && event.source.getExpansions("wba_bi").length > 0);
				},
				async content(event, trigger, player) {
					const source = trigger.source;
					const x = source.getExpansions("wba_bi").length;
					await source.chooseToDiscard(x, "he", true);
				},
			},
		},
	},

	/* ============ 中路杀神·许盛杰 ============ */
	// 祈雨：回合开始时，你可进行一次判定，若结果为黑色，则你可将其置于你的武将牌上，称为“雨”，
	// 当你的“雨”达到三张或更多时，你减一点体力上限，并永久获得技能“雨神”。
	wba_qiyu: {
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_qiyu"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const judge = player.judge(card => (get.color(card, player) === "black" ? 1 : -1));
			judge.set("callback", async judgeEvt => {
				if (!judgeEvt.judgeResult || get.color(judgeEvt.judgeResult, player) !== "black" || get.position(judgeEvt.card, true) !== "o") {
					return;
				}
				const r = await player
					.chooseBool("祈雨：是否将判定牌置于你的武将牌上，称为“雨”？")
					.set("ai", () => true)
					.forResult();
				if (!r.bool) {
					return;
				}
				const next = player.addToExpansion(judgeEvt.card, player, "give");
				next.gaintag.add("wba_yu");
				await next;
				player.markSkill("wba_qiyu");
				const count = player.getExpansions("wba_yu").length;
				game.log(player, "获得了一张", "#g“雨”", "，当前共有", count, "张");
				if (count >= 3 && !player.storage.wba_qiyu_awaken) {
					player.storage.wba_qiyu_awaken = true;
					await player.loseMaxHp();
					await player.addSkills("wba_yushen");
				}
			});
			await judge.forResult();
		},
		intro: {
			markcount(storage, player) {
				return player.getExpansions("wba_yu").length;
			},
			content(storage, player) {
				const n = player.getExpansions("wba_yu").length;
				return n ? "武将牌上有" + get.cnNumber(n) + "张“雨”" : "没有“雨”";
			},
		},
	},
	// 雨神：你可以将“雨”当作“水淹七军”打出。
	// 注：【水淹七军】(shuiyanqijunx) 仅在“国战”卡包中定义，非国战模式下 lib.card.shuiyanqijunx 为空，此技能会自动不可用。
	// 实现参考“放箭”（group3.js wba_fangjian）：expansion 区（position: "x"）的牌无法通过
	// enable:"chooseToUse" + filterCard/position 的声明式选牌 UI 弹出，只能手动 chooseButton 选牌
	// 再 get.autoViewAs 构造成牌使用。
	wba_yushen: {
		enable: "phaseUse",
		filter(event, player) {
			return Boolean(lib.card.shuiyanqijunx) && player.getExpansions("wba_yu").length > 0;
		},
		async content(event, trigger, player) {
			const yu = player.getExpansions("wba_yu");
			const r = await player
				.chooseButton(["雨神：将一张“雨”当【水淹七军】使用", yu], true)
				.set("ai", button => 6 - get.value(button.link))
				.forResult();
			if (!r || !r.bool || !r.links || !r.links.length) {
				return;
			}
			const chosen = r.links[0];
			// chooseUseTarget 不会像声明式 viewAs 技能那样自动消耗扩展区里作为“代价”的原始牌，
			// 必须手动移除，否则“雨”永远不会减少，可以无限使用。
			await player.loseToDiscardpile([chosen]);
			const card = get.autoViewAs({ name: "shuiyanqijunx", isCard: true }, [chosen]);
			await player.chooseUseTarget(card, true, false);
		},
		ai: {
			order: 7,
			result: { player: 1 },
		},
	},
	// 预知：当你在回合外失去牌时，你可以观看一名角色的X张手牌，并将你失去的牌与其中一张牌对换（X为“雨”的数量）。
	wba_yuzhi: {
		trigger: { player: "loseEnd" },
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			if (!player.getExpansions("wba_yu").length) {
				return false;
			}
			if (!event.cards || !event.cards.length) {
				return false;
			}
			return game.hasPlayer(cur => cur !== player && cur.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_yuzhi"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const lostCards = trigger.cards.slice();
			let loseCard = lostCards[0];
			if (lostCards.length > 1) {
				const r0 = await player
					.chooseCardButton({
						prompt: "预知：选择要换出的一张已失去的牌",
						cards: lostCards,
						forced: true,
					})
					.forResult();
				if (r0 && r0.links && r0.links.length) {
					loseCard = r0.links[0];
				}
			}
			const r1 = await player
				.chooseTarget("预知：观看一名角色的手牌", (card, p, target) => target !== p && target.countCards("h") > 0)
				.set("ai", target => get.attitude(player, target))
				.forResult();
			if (!r1.bool || !r1.targets || !r1.targets.length) {
				return;
			}
			const target = r1.targets[0];
			const x = player.getExpansions("wba_yu").length;
			const viewCards = target.getCards("h").randomGets(Math.min(x, target.countCards("h")));
			if (!viewCards.length) {
				return;
			}
			player.line(target, "green");
			const r2 = await player
				.chooseCardButton({
					prompt: "预知：观看的" + get.translation(target) + "的手牌，选择一张与你失去的牌交换",
					cards: viewCards,
					forced: true,
				})
				.forResult();
			if (!r2 || !r2.links || !r2.links.length) {
				return;
			}
			const swapCard = r2.links[0];
			await target.gain([loseCard], "gain2");
			await player.gain([swapCard], "gain2");
			game.log(player, "“预知”将", loseCard, "与", target, "的", swapCard, "对换");
		},
	},

	/* ============ 赤脚大仙·杜时宇 ============ */
	// 脱鞋：每回合限一次，出牌阶段，若你装备区内有防具或马，你可以弃掉一张装备牌并选择一名角色，
	// 若该角色装备区内有装备牌，则你可获得其中一张装备牌，否则扣除对方一点体力。
	wba_dushiyu_tuoxie: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return !!(player.getEquip(2) || player.getEquip(3) || player.getEquip(4));
		},
		filterCard(card) {
			return get.type(card) === "equip" && get.position(card, true) === "e";
		},
		selectCard: 1,
		position: "e",
		filterTarget() {
			return true;
		},
		async content(event, trigger, player) {
			const target = event.target;
			await player.discard(event.cards);
			if (target.countCards("e")) {
				player.line(target, "green");
				await player.gainPlayerCard(target, "e", 1, true);
			} else {
				await target.loseHp();
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					return target.countCards("e") ? 1 : get.attitude(player, target) < 0 ? 1 : -1;
				},
			},
		},
	},
	// 赤脚：当你装备区内没有防具和马时，你拥有技能“脚气”，且其它角色对你使用“杀”时，需额外弃掉一张牌，否则此“杀”无效。
	wba_chijiao: {
		locked: true,
		forced: true,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (player.getEquip(2) || player.getEquip(3) || player.getEquip(4)) {
				return false;
			}
			return event.target === player && !!event.card && event.card.name === "sha";
		},
		async content(event, trigger, player) {
			const source = trigger.player;
			const result = await source
				.chooseToDiscard("he", true, 1)
				.set("prompt", "赤脚：请弃置一张牌，否则你对" + get.translation(player) + "使用的【杀】无效")
				.set("ai", card => 5 - get.value(card))
				.forResult();
			if (!result || !result.bool) {
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
	},
	// 脚气：回合结束阶段，若你在本回合弃牌阶段弃掉了两张或更多手牌，你可使包括自己在内的所有角色失去一点体力。
	wba_jiaoqi: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			if (player.getEquip(2) || player.getEquip(3) || player.getEquip(4)) {
				return false;
			}
			// getParent(name) 不传 forced:true 时，找不到匹配祖先会返回一个真值的空对象 {}
			// 而非 undefined，所以必须显式传 forced:true，否则等于没做任何祖先过滤。
			const evts = player.getHistory("lose", evt => {
				if (evt.type !== "discard") {
					return false;
				}
				const p = evt.getParent("phaseDiscard", true);
				return !!p && p.player === player;
			});
			let count = 0;
			for (const evt of evts) {
				count += (evt.cards || []).length;
			}
			return count >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_jiaoqi"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await game.doAsyncInOrder(game.filterPlayer(), p => p.loseHp());
		},
	},

	/* ============ 非洲皇帝·刘阳河 ============ */
	// 宠电宝：出牌阶段，你可以展示一张手牌，并要求一名角色交给你一张相同类型的手牌，
	// 否则将你展示的手牌置于其角色牌上，视为“兵粮寸断”。
	wba_chongdianbao: {
		enable: "phaseUse",
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(cur => cur !== player);
		},
		filterCard: true,
		selectCard: 1,
		position: "h",
		discard: false,
		lose: false,
		filterTarget(card, player, target) {
			// 兵粮寸断是延时锦囊，同一名角色的判定区不能同时存在两张；否则电脑会对同一目标
			// 连续发动本技能，导致同一人身上叠好几张“兵粮寸断”。
			return target !== player && target.canAddJudge("bingliang", player);
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const card = event.cards[0];
			const target = event.target;
			await player.showCards(card, get.translation(player) + "展示了一张手牌");
			const type = get.type(card);
			const result = await target
				.chooseToGive(player, "he", 1, `宠电宝：是否交给${get.translation(player)}一张${get.translation(type)}牌？`)
				.set("filterCard", c => get.type(c) === type)
				.forResult();
			if (result && result.bool && result.cards && result.cards.length) {
				return;
			}
			if (!player.getCards("h").includes(card)) {
				return;
			}
			await target.addJudge("bingliang", [card]);
		},
		ai: { order: 5, result: { target: -1 } },
	},
	// 非洲血统：场上任意角色的判定牌结果若为黑色，你可以摸一张牌。
	wba_feizhouxuetong: {
		trigger: { global: "judgeEnd" },
		filter(event, player) {
			return !!(event.result && event.result.color === "black");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_feizhouxuetong"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},

	/* ============ 斗战胜佛·何智昭 ============ */
	// 佛心：当你即将受到一点伤害时，你可以弃两张牌，使该伤害无效化。
	wba_hezhizhao_foxin: {
		trigger: { player: "damageBegin1" },
		filter(event, player) {
			return event.num === 1 && player.countCards("he") >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(2, "he", false)
				.set("prompt", get.prompt2("wba_hezhizhao_foxin"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
			game.log(player, "发动“佛心”，防止了此次伤害");
		},
	},
	// 佛光普照：摸牌阶段，你可以额外摸五张牌，若如此做，你须将其中X张分给其他角色（X为你剩余的体力值）。
	wba_foguangpuzhao: {
		trigger: { player: "phaseDrawBegin2" },
		filter(event, player) {
			return !event.numFixed;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_foguangpuzhao"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const result = await player.draw(5).forResult();
			const cards = (result && result.cards) || [];
			const x = Math.min(player.hp, cards.length);
			for (let i = 0; i < x; i++) {
				if (!game.hasPlayer(cur => cur !== player)) {
					break;
				}
				const remaining = player.getCards("h").filter(c => cards.includes(c));
				if (!remaining.length) {
					break;
				}
				const r = await player
					.chooseCardTarget({
						prompt: "佛光普照：分配一张牌给其他角色",
						filterCard: c => remaining.includes(c),
						selectCard: 1,
						position: "h",
						filterTarget: (c, p, target) => target !== p,
						ai1: c => -get.value(c),
						ai2: target => get.attitude(player, target),
					})
					.forResult();
				if (!r.bool || !r.cards || !r.cards.length || !r.targets || !r.targets.length) {
					break;
				}
				await player.give(r.cards, r.targets[0]);
			}
		},
	},
};

export const translate = {
	wba_liuziping_dream: "刘子平",
	wba_dxz: "打响指",
	wba_dxz_info: "回合结束阶段，你打一个响指，指定一名其他角色并扰乱他，该角色下一回合摸牌阶段少摸一张牌。",
	wba_zmjz: "在梦境中",
	wba_zmjz_info: "摸牌阶段，你可以额外摸两张牌，并将这两张牌分配给任意角色。",
	wba_jingxing: "惊醒",
	wba_jingxing_info: "锁定技，回合结束阶段，若你于本回合发动过“在梦境中”，则你将武将牌翻面。",

	wba_zbkm_gaowen: "装逼狂魔·高雯",
	wba_gaowen_zhuangbi: "装逼",
	wba_gaowen_zhuangbi_info: "每当你造成一点伤害时，你可以进行一次判定，若结果不为红桃，则将判定牌置于你的角色牌上，称为“逼”。你的“逼”数量每加一，你与其它角色攻击距离减一。当你的“逼”达到三张或更多时，你须减一点体力上限，并永久获得技能“我从来不装逼”。",
	wba_cclbzb: "我从来不装逼",
	wba_cclbzb_info: "你可以将“逼”置于其它角色的角色牌上，若如此做，当你受到来自该角色的伤害时，该角色需弃置X张牌（X为其角色牌上“逼”的数量）。",

	wba_zlss_xushengjie: "中路杀神·许盛杰",
	wba_qiyu: "祈雨",
	wba_qiyu_info: "回合开始时，你可进行一次判定，若结果为黑色，则你可将其置于你的武将牌上，称为“雨”，当你的“雨”达到三张或更多时，你减一点体力上限，并永久获得技能“雨神”。",
	wba_yushen: "雨神",
	wba_yushen_info: "你可以将“雨”当作“水淹七军”打出。",
	wba_yuzhi: "预知",
	wba_yuzhi_info: "当你在回合外失去牌时，你可以观看一名角色的X张手牌，并将你失去的牌与其中一张牌对换（X为“雨”的数量）。",

	wba_cjdx_dushiyu: "赤脚大仙·杜时宇",
	wba_dushiyu_tuoxie: "脱鞋",
	wba_dushiyu_tuoxie_info: "每回合限一次，出牌阶段，若你装备区内有防具或马，你可以弃掉一张装备牌并选择一名角色，若该角色装备区内有装备牌，则你可获得其中一张装备牌，否则扣除对方一点体力。",
	wba_chijiao: "赤脚",
	wba_chijiao_info: "当你装备区内没有防具和马时，你拥有技能【脚气】，且其它角色对你使用【杀】时，需额外弃掉一张牌，否则此【杀】无效。",
	wba_jiaoqi: "脚气",
	wba_jiaoqi_info: "回合结束阶段，若你在本回合弃牌阶段弃掉了两张或更多手牌，你可使包括自己在内的所有角色失去一点体力。",

	wba_fzhd_liuyanghe: "非洲皇帝·刘阳河",
	wba_chongdianbao: "宠电宝",
	wba_chongdianbao_info: "出牌阶段，你可以展示一张手牌，并要求一名角色交给你一张相同类型的手牌，否则将你展示的手牌置于其角色牌上，视为【兵粮寸断】。",
	wba_feizhouxuetong: "非洲血统",
	wba_feizhouxuetong_info: "场上任意角色的判定牌结果若为黑色，你可以摸一张牌。",

	wba_dzsf_hezhizhao: "斗战胜佛·何智昭",
	wba_hezhizhao_foxin: "佛心",
	wba_hezhizhao_foxin_info: "当你即将受到一点伤害时，你可以弃两张牌，使该伤害无效化。",
	wba_foguangpuzhao: "佛光普照",
	wba_foguangpuzhao_info: "摸牌阶段，你可以额外摸五张牌，若如此做，你须将其中X张分给其他角色（X为你剩余的体力值）。",
};
