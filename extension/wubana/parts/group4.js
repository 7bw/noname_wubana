import { lib, game, ui, get, ai, _status } from "noname";

export const character = {
	wba_chenjiahao: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_jilao", "wba_heidong"],
	},
	wba_chenkaihua: {
		sex: "male",
		group: "xue",
		hp: 5,
		// 初始仅有“向日”；“开花”在“日”达到3张时由“向日”授予（衍生技）
		skills: ["wba_xiangri"],
	},
	wba_chenyi: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_banfei", "wba_xidu"],
	},
	wba_hezhizhao: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_nianjing", "wba_foxin"],
	},
	wba_dushiyu: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_tuoxie", "wba_moha"],
	},
	wba_dahuang: {
		sex: "male",
		group: "xue",
		hp: 2,
		// 初始仅有“肺炸”；“法克鱿”“你爸爸”由“肺炸”在濒死时授予（衍生技）
		skills: ["wba_feizha"],
	},
	wba_libowei: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_beishi", "wba_xiaohua"],
	},
	wba_qizhiyue: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_huaxin", "wba_biaozhun", "wba_manizenmele"],
	},
};

export const skill = {
	// ============ 陈嘉豪 ============
	wba_jilao: {
		audio: false,
		forced: true,
		locked: true,
		trigger: { player: "damageBegin1", source: "damageBegin1" },
		filter(event, player) {
			// 男性角色对你造成的伤害
			if (event.player === player && event.source && event.source !== player && event.source.sex === "male") {
				return true;
			}
			// 你对男性角色造成的伤害
			if (event.source === player && event.player && event.player !== player && event.player.sex === "male") {
				return true;
			}
			return false;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},
	wba_heidong: {
		audio: false,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			if (!(event.num > 0)) {
				return false;
			}
			const card = event.card;
			// 技能附加伤害（无来源牌）视为可发动
			if (!card) {
				return true;
			}
			// 群体锦囊
			return ["wanjian", "nanman"].includes(card.name);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2(event.skill))
				.set("choice", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const result = await player
				.judge(card => (get.color(card) === "black" ? 2 : -2))
				.forResult();
			if (result && result.bool) {
				trigger.cancel();
			}
		},
	},

	// ============ 陈凯华 ============
	wba_xiangri: {
		audio: false,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2(event.skill))
				.set("choice", true)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = get.cards(trigger.num);
			const next = player.addToExpansion(cards, player, "gain2");
			next.gaintag.add("wba_ri");
			await next;
			if (!player.storage.wba_xiangri && player.getExpansions("wba_ri").length >= 3) {
				player.storage.wba_xiangri = true;
				await player.loseMaxHp();
				// “日”达到3张：永久获得技能“开花”
				if (!player.hasSkill("wba_kaihua")) {
					await player.addSkills("wba_kaihua");
				}
			}
		},
		derivation: ["wba_kaihua"],
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("wba_ri").length;
			},
		},
	},
	wba_kaihua: {
		audio: false,
		enable: "phaseUse",
		filter(event, player) {
			return player.getExpansions("wba_ri").length > 0;
		},
		filterTarget(card, player, target) {
			return player !== target;
		},
		selectTarget: 1,
		async content(event, trigger, player) {
			const { target } = event;
			player.chat("吥屎啦你");
			const expansions = player.getExpansions("wba_ri");
			let cards;
			if (expansions.length <= 1) {
				cards = expansions.slice();
			} else {
				const result = await player
					.chooseButton(["开花：选择要移动的“日”（数量决定其手牌上限减少量）", expansions], [1, expansions.length], true)
					.set("ai", () => 1)
					.forResult();
				cards = result.bool ? result.links.slice() : [expansions[0]];
			}
			const num = cards.length;
			const next = target.addToExpansion(cards, player, "give");
			next.gaintag.add("wba_kaihua_ri");
			await next;
			target.addTempSkill("wba_kaihua_effect", { player: "phaseAfter" });
			target.storage.wba_kaihua_effect = (target.storage.wba_kaihua_effect || 0) + num;
			target.markSkill("wba_kaihua_effect");
			game.log(target, "的下回合手牌上限减少了", get.cnNumber(num));
		},
		ai: {
			order: 3,
			result: {
				target(player, target) {
					return -1;
				},
			},
		},
	},

	// ============ 陈翼 ============
	wba_banfei: {
		audio: false,
		enable: "chooseToUse",
		usable: 1,
		filterCard(card) {
			return get.suit(card) === "heart";
		},
		position: "hs",
		viewAs: { name: "wuzhong" },
		viewAsFilter(player) {
			if (player.getStat("skill").wba_banfei) {
				return false;
			}
			return player.countCards("hs", { suit: "heart" }) > 0;
		},
		prompt: "将一张红桃手牌当做【无中生有】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 9 },
	},
	wba_xidu: {
		audio: false,
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			const list = ["多出杀"];
			if (game.hasPlayer(current => current.countCards("j") > 0)) {
				list.push("移除判定");
			}
			if (game.hasPlayer(current => current !== player && current.countCards("h") > 0)) {
				list.push("抽手牌");
			}
			list.push("cancel2");
			const { control } = await player
				.chooseControl({
					prompt: get.prompt2(event.skill),
					controls: list,
					ai() {
						const p = _status.event.player;
						const controls = _status.event.controls;
						if (p.hp <= 1) {
							return "cancel2";
						}
						if (controls.includes("抽手牌") && game.hasPlayer(cur => cur !== p && get.attitude(p, cur) < 0 && cur.countCards("h") > 0)) {
							return "抽手牌";
						}
						if (controls.includes("移除判定") && p.countCards("j", card => card.name === "lebu" || card.name === "shandian")) {
							return "移除判定";
						}
						return "cancel2";
					},
				})
				.forResult();
			if (control === "cancel2") {
				event.result = { bool: false };
			} else {
				event.result = { bool: true, cost_data: { control } };
			}
		},
		async content(event, trigger, player) {
			await player.loseHp();
			const control = event.cost_data.control;
			if (control === "多出杀") {
				player.addTempSkill("wba_xidu_sha", "phaseUseAfter");
			} else if (control === "移除判定") {
				const result = await player
					.chooseTarget({
						prompt: "吸毒：移除一名角色判定区里的一张牌",
						filterTarget(card, player, target) {
							return target.countCards("j") > 0;
						},
						ai(target) {
							return target === get.player() ? 10 : 0;
						},
					})
					.forResult();
				if (result.bool && result.targets.length) {
					await player.discardPlayerCard(result.targets[0], "j", true);
				}
			} else if (control === "抽手牌") {
				const result = await player
					.chooseTarget({
						prompt: "吸毒：获得其他一名角色的一张手牌",
						filterTarget(card, player, target) {
							return target !== player && target.countCards("h") > 0;
						},
						ai(target) {
							return -get.attitude(get.player(), target);
						},
					})
					.forResult();
				if (result.bool && result.targets.length) {
					await player.gainPlayerCard(result.targets[0], "h", true);
				}
			}
		},
		ai: { threaten: 1.1 },
	},

	// ============ 何智昭 ============
	wba_nianjing: {
		audio: false,
		trigger: { global: "judge" },
		filter(event, player) {
			return player.countCards("hs", card => get.color(card) === "red") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCard({
					prompt: `${get.translation(trigger.player)}的${trigger.judgestr || ""}判定为${get.translation(trigger.player.judging[0])}，${get.prompt(event.skill)}`,
					filterCard(card) {
						return get.color(card) === "red";
					},
					position: "hs",
					ai(card) {
						const trigger = get.event().getTrigger();
						const player = get.player();
						const judging = get.event().judging;
						const result = trigger.judge(card) - trigger.judge(judging);
						const attitude = get.attitude(player, trigger.player);
						if (attitude === 0 || result === 0) {
							return 0;
						}
						const val = get.value(card) / 3;
						if (attitude > 0) {
							return result - val;
						}
						return -result - val;
					},
				})
				.set("judging", trigger.player.judging[0])
				.forResult();
		},
		popup: false,
		async content(event, trigger, player) {
			const next = player.respond({
				cards: event.cards,
				skill: event.name,
				highlight: true,
				noOrdering: true,
			});
			await next;
			const { cards } = next;
			if (cards?.length) {
				if (trigger.player.judging[0].clone) {
					trigger.player.judging[0].clone.classList.remove("thrownhighlight");
					game.broadcast(card => {
						if (card.clone) {
							card.clone.classList.remove("thrownhighlight");
						}
					}, trigger.player.judging[0]);
					game.addVideo("deletenode", player, get.cardsInfo([trigger.player.judging[0].clone]));
				}
				await game.cardsDiscard(trigger.player.judging[0]);
				trigger.player.judging[0] = cards[0];
				trigger.orderingCards.addArray(cards);
				game.log(trigger.player, "的判定牌改为", cards);
				await game.delay(2);
			}
		},
		ai: {
			rejudge: true,
			tag: { rejudge: 1 },
		},
	},
	wba_foxin: {
		audio: false,
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return event.num > 0 && player.countCards("h") >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(2, "h", get.prompt2(event.skill))
				.set("ai", card => {
					const p = get.player();
					if (p.hp > 2) {
						return 0;
					}
					return 8 - get.value(card);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			trigger.cancel();
		},
	},

	// ============ 杜时宇 ============
	wba_tuoxie: {
		audio: false,
		enable: "phaseUse",
		usable: 2,
		position: "he",
		filter(event, player) {
			return player.countCards("he", { type: "equip" }) > 0;
		},
		filterCard(card) {
			return get.type(card) === "equip";
		},
		selectCard: 1,
		filterTarget(card, player, target) {
			return player !== target;
		},
		prompt: "弃置一张装备牌并选择一名其他角色：若其装备区里有牌，你获得其一张装备牌，否则其失去1点体力",
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const { target } = event;
			if (target.countCards("e") > 0) {
				await player.gainPlayerCard(target, "e", true);
			} else {
				await target.loseHp();
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					return -1.5;
				},
			},
		},
	},
	wba_moha: {
		audio: false,
		forced: true,
		locked: true,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return event.player && event.player.isIn() && event.num > 0;
		},
		async content(event, trigger, player) {
			const num = trigger.num;
			const victim = trigger.player;
			trigger.cancel();
			if (victim && victim.isIn()) {
				await victim.loseHp(num);
			}
		},
	},

	// ============ 大黄 ============
	wba_feizha: {
		audio: false,
		enable: "chooseToUse",
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		filter(event, player) {
			return event.type === "dying" && player === event.dying;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = player.getCards("he");
			if (cards.length) {
				await player.discard(cards);
			}
			await player.draw(2);
			if (player.hp < 2) {
				await player.recover(2 - player.hp);
			}
			await player.addSkills(["wba_fakeyou", "wba_nibaba"]);
		},
		derivation: ["wba_fakeyou", "wba_nibaba"],
		ai: {
			order: 1,
			save: true,
			skillTagFilter(player, tag, target) {
				if (player !== target) {
					return false;
				}
			},
			result: {
				player(player) {
					return player.hp <= 0 ? 10 : 0;
				},
			},
		},
	},
	// 大黄的两个衍生共享技能，在此定义
	wba_fakeyou: {
		audio: false,
		trigger: { player: "shaMiss" },
		filter(event, player) {
			return event.card && event.card.name === "sha" && event.target && event.target.isIn() && event.target.countCards("h") > 0;
		},
		logTarget: "target",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_fakeyou", trigger.target))
				.set("choice", get.attitude(player, trigger.target) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			player.chat("法克鱿");
			if (trigger.target.isIn() && trigger.target.countCards("h") > 0) {
				await player.discardPlayerCard(trigger.target, "h", true);
			}
		},
	},
	wba_nibaba: {
		audio: false,
		trigger: { player: "loseAfter" },
		filter(event, player) {
			if (_status.currentPhase === player) {
				return false;
			}
			let num = 0;
			const lost = event.getl ? event.getl(player) : null;
			if (lost) {
				num = (lost.hs ? lost.hs.length : 0) + (lost.es ? lost.es.length : 0) + (lost.js ? lost.js.length : 0);
			} else if (event.cards2) {
				num = event.cards2.length;
			}
			if (num <= 0) {
				return false;
			}
			return game.hasPlayer(current => current !== player && current.countCards("h") > 0);
		},
		async cost(event, trigger, player) {
			let source = trigger.getParent() ? trigger.getParent().player : null;
			if (!source || source === player || !source.isIn() || !source.countCards("h")) {
				source = null;
			}
			if (source) {
				const result = await player
					.chooseBool(get.prompt2("wba_nibaba", source))
					.set("choice", get.attitude(player, source) < 0)
					.forResult();
				result.targets = [source];
				event.result = result;
			} else {
				event.result = await player
					.chooseTarget({
						prompt: get.prompt("wba_nibaba"),
						filterTarget(card, player, target) {
							return target !== player && target.countCards("h") > 0;
						},
						ai(target) {
							return -get.attitude(get.player(), target);
						},
					})
					.forResult();
			}
		},
		async content(event, trigger, player) {
			player.chat("你爸爸");
			const target = event.targets[0];
			if (target && target.isIn() && target.countCards("h") > 0) {
				await player.discardPlayerCard(target, "h", true);
			}
		},
	},

	// ============ 李博为 ============
	wba_beishi: {
		audio: false,
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0 && event.source && event.source !== player && event.source.isIn() && event.source.countCards("h") > 0;
		},
		logTarget: "source",
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2(event.skill, trigger.source))
				.set("choice", get.attitude(player, trigger.source) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			player.chat("吥屎啦你");
			const num = trigger.num;
			for (let i = 0; i < num; i++) {
				if (!trigger.source || !trigger.source.isIn() || !trigger.source.countCards("h")) {
					break;
				}
				await player.gainPlayerCard(trigger.source, "h", true);
			}
		},
	},
	wba_xiaohua: {
		audio: false,
		forced: true,
		locked: true,
		trigger: { player: "phaseJieshuBegin" },
		async content(event, trigger, player) {
			await player.draw(1);
		},
	},

	// ============ 戚知悦 ============
	wba_huaxin: {
		audio: false,
		forced: true,
		locked: true,
		trigger: { player: "useCardToPlayered", target: "useCardToTargeted" },
		filter(event, player) {
			if (event.card.name !== "sha") {
				return false;
			}
			// 你对女性角色使用杀
			if (event.player === player) {
				return event.target && event.target !== player && event.target.sex === "female";
			}
			// 女性角色对你使用杀
			if (event.target === player) {
				return event.player !== player && event.player.sex === "female";
			}
			return false;
		},
		logTarget(trigger, player) {
			return trigger.player === player ? trigger.target : trigger.player;
		},
		async content(event, trigger, player) {
			const id = trigger.target.playerid;
			const map = trigger.getParent() ? trigger.getParent().customArgs : null;
			if (id != null && map) {
				if (!map[id]) {
					map[id] = {};
				}
				if (typeof map[id].shanRequired === "number") {
					map[id].shanRequired++;
				} else {
					map[id].shanRequired = 2;
				}
			}
		},
	},
	wba_biaozhun: {
		audio: false,
		trigger: { player: ["loseHpAfter", "damageEnd"] },
		filter(event, player) {
			return event.num > 0 && player.countCards("he") >= 2 && game.hasPlayer(current => current.isDamaged());
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard(2, "he", get.prompt2(event.skill))
				.set("ai", card => 6 - get.value(card))
				.forResult();
		},
		async content(event, trigger, player) {
			player.chat("tiu");
			const result = await player
				.chooseTarget({
					prompt: "发音很标准：令任意一名角色回复1点体力",
					forced: true,
					filterTarget(card, player, target) {
						return target.isDamaged();
					},
					ai(target) {
						return get.recoverEffect(target, get.player(), get.player());
					},
				})
				.forResult();
			if (result.bool && result.targets.length) {
				await result.targets[0].recover();
			}
		},
	},
	wba_manizenmele: {
		audio: false,
		enable: "chooseToUse",
		filterCard(card) {
			return get.suit(card) === "spade";
		},
		position: "hs",
		viewAs: { name: "juedou" },
		viewAsFilter(player) {
			return player.countCards("hs", { suit: "spade" }) > 0;
		},
		prompt: "将一张黑桃牌当做【决斗】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 4 },
	},

	// ============ 标记 / 子技能 ============
	wba_ri: {
		marktext: "日",
		intro: {
			name: "日",
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
	},
	wba_kaihua_ri: {
		marktext: "日",
		intro: {
			name: "日",
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions(skill);
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
	},
	wba_kaihua_effect: {
		charlotte: true,
		marktext: "花",
		intro: {
			content(storage, player) {
				return "下回合手牌上限-" + (player.storage.wba_kaihua_effect || 0);
			},
		},
		mod: {
			maxHandcard(player, num) {
				return num - (player.storage.wba_kaihua_effect || 0);
			},
		},
		onremove(player, skill) {
			delete player.storage[skill];
		},
	},
	wba_xidu_sha: {
		charlotte: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name === "sha") {
					return num + 2;
				}
			},
		},
	},
};

export const translate = {
	// 武将
	wba_chenjiahao: "陈嘉豪",
	wba_chenkaihua: "陈凯华",
	wba_chenyi: "陈翼",
	wba_hezhizhao: "何智昭",
	wba_dushiyu: "杜时宇",
	wba_dahuang: "大黄",
	wba_libowei: "李博为",
	wba_qizhiyue: "戚知悦",

	// 技能
	wba_jilao: "基佬",
	wba_jilao_info: "锁定技，男性角色对你、你对男性角色造成的伤害均+1。",
	wba_heidong: "黑洞",
	wba_heidong_info: "当你受到群体伤害或技能造成的伤害时，你可以进行一次判定，若结果为黑色，则此伤害无效。",
	wba_xiangri: "向日",
	wba_xiangri_info: "每当你受到伤害后，你可以从牌堆顶取等量的牌置于你的武将牌上，称为“日”。每有一张“日”，你的手牌上限便+1。当你拥有的“日”达到三张或更多时，你减少1点体力上限（仅一次）。",
	wba_kaihua: "开花",
	wba_kaihua_info: "出牌阶段，你可以大喊“吥屎啦你”，将至多X张“日”置于一名角色的武将牌上，令其下回合手牌上限-X。",
	wba_banfei: "班费",
	wba_banfei_info: "每回合限一次，你可以将一张红桃手牌当做【无中生有】使用。",
	wba_xidu: "吸毒",
	wba_xidu_info: "准备阶段，你可以减少1点体力，然后选择一项：1.本回合出牌阶段你可以多使用两张【杀】；2.移除一名角色判定区里的一张牌；3.获得其他一名角色的一张手牌。",
	wba_nianjing: "念经",
	wba_nianjing_info: "一名角色的判定牌生效前，你可以打出一张红色牌替换之。",
	wba_foxin: "佛心",
	wba_foxin_info: "当你受到伤害时，你可以弃置两张手牌，防止此伤害。",
	wba_tuoxie: "脱鞋",
	wba_tuoxie_info: "出牌阶段限两次，你可以弃置一张装备牌并选择一名其他角色：若其装备区里有牌，你获得其装备区里的一张牌；否则其失去1点体力。",
	wba_moha: "膜蛤",
	wba_moha_info: "锁定技，你造成的伤害均视为体力流失。",
	wba_feizha: "肺炸",
	wba_feizha_info: "限定技，当你处于濒死状态时，你可以弃置所有手牌与装备牌，然后摸两张牌、将体力回复至2点，并永久获得技能〖法克鱿〗和〖你爸爸〗。",
	wba_fakeyou: "法克鱿",
	wba_fakeyou_info: "当你使用的【杀】被【闪】抵消时，你可以大喊“法克鱿”，弃置该角色的一张手牌。",
	wba_nibaba: "你爸爸",
	wba_nibaba_info: "每当你于回合外失去一张牌后，你可以大喊“你爸爸”，弃置来源角色的一张手牌（若无明确来源，则你可选择一名其他角色）。",
	wba_beishi: "吥屎",
	wba_beishi_info: "每当其他角色对你造成伤害后，你可以大喊“吥屎啦你”，获得其等量的手牌。",
	wba_xiaohua: "校花",
	wba_xiaohua_info: "锁定技，结束阶段开始时，你摸一张牌。",
	wba_huaxin: "花心",
	wba_huaxin_info: "锁定技，女性角色对你使用的【杀】、或你对女性角色使用的【杀】，其目标角色需依次使用两张【闪】才能抵消。",
	wba_biaozhun: "发音很标准",
	wba_biaozhun_info: "当你受到伤害或失去体力后，你可以念一声“tiu”并弃置两张牌，令任意一名角色回复1点体力。",
	wba_manizenmele: "骂你怎么了",
	wba_manizenmele_info: "你可以将一张黑桃牌当做【决斗】使用。",

	// 标记 / 子技能
	wba_ri: "日",
	wba_ri_info: "置于武将牌上的“日”。",
	wba_kaihua_ri: "日",
	wba_kaihua_ri_info: "由“开花”置于武将牌上的“日”。",
	wba_kaihua_effect: "开花",
	wba_kaihua_effect_info: "下回合手牌上限减少。",
	wba_xidu_sha: "吸毒",
	wba_xidu_sha_info: "本回合出牌阶段可多使用两张【杀】。",
};
