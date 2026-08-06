import { lib, game, ui, get, ai, _status } from "noname";

// 五班阿扩展 —— 分组5（球队/乐队等主题DIY武将，共7名）
// 说明：本文件中的“化身/模仿”等复杂机制均为自足的简化实现，
// 仅依赖公共 API（get.gainableCharacters / addAdditionalSkills / broadcastAll 等），
// 不复用神话将“化身(huashen)”的内部状态机。简化处均在对应技能上以注释标明。

export const character = {
	// 1) 邱昊嵘
	wba_qiuhaorong: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_mofang", "wba_xinsheng"],
	},
	// 2) 宋轶健
	wba_songyijian: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_xuewei", "wba_buwei"],
	},
	// 3) 徐家澍
	wba_xujiashu: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_cool", "wba_chifan"],
	},
	// 4) 徐施舟
	wba_xushizhou: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_xiuxian1", "wba_xiaoyan"],
	},
	// 5) 许盛杰
	wba_xushengjie: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_xiuxian2", "wba_zhonger"],
	},
	// 6) 刘阳河
	wba_liuyanghe: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_feizhou", "wba_dahe"],
	},
	// 7) 宋沼（初始只有“装逼”与“八天八夜”，“一向是第一”由八天八夜切换获得）
	wba_songzhao: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_zhuangbi", "wba_batian"],
	},
};

export const skill = {
	// ============================ 邱昊嵘 ============================
	// 模仿：简化版“化身”。游戏开始时随机获得两张未加入游戏的武将牌，
	// 选一张置于面前并声明其一项技能（不可声明限定技/觉醒技/主公技），
	// 你拥有该技能且性别/势力视为与该武将相同，直到化身被替换；
	// 每个回合开始时与结束后，你可以更换化身并重新声明技能。
	wba_mofang: {
		init(player) {
			if (!Array.isArray(player.storage.wba_mofang)) {
				player.storage.wba_mofang = [];
			}
		},
		intro: {
			content(storage, player) {
				if (Array.isArray(storage) && storage.length) {
					let str = "化身：" + get.translation(storage);
					const cur = player.storage.wba_mofang_current;
					if (cur) {
						str += "<br>当前：" + get.translation(cur);
					}
					return str;
				}
				return "没有化身";
			},
		},
		trigger: { global: "gameStart", player: ["phaseBegin", "phaseAfter"] },
		filter(event, player, name) {
			if (name === "gameStart") {
				return true;
			}
			// 回合开始/结束后：只要有化身（或尚未初始化）即可尝试替换
			return true;
		},
		async cost(event, trigger, player) {
			if (event.triggername === "gameStart") {
				event.result = { bool: true };
			} else {
				event.result = await player.chooseBool(get.prompt2("wba_mofang")).forResult();
			}
		},
		async content(event, trigger, player) {
			if (!Array.isArray(player.storage.wba_mofang)) {
				player.storage.wba_mofang = [];
			}
			// 简化：游戏开始时（或化身为空时兜底）随机获得两张未加入游戏的武将牌
			if (event.triggername === "gameStart" || player.storage.wba_mofang.length === 0) {
				// 不排除 wba_ 前缀的武将——之前排除了整个 wubana 扩展自己的 57 名武将，
				// 若房间只启用了 wubana 扩展，候选池会直接变空，导致本技能彻底不起效。
				// 同时直接按“是否有可声明的技能”过滤（而非“是否有任意技能”），与后面
				// 声明技能时的判定条件保持一致。
				const pool = get.gainableCharacters((info, name) => {
					if (!Array.isArray(info[3]) || !info[3].length) {
						return false;
					}
					return info[3].some(skill => {
						const skillInfo = get.info(skill);
						if (!skillInfo) {
							return false;
						}
						const cats = get.skillCategoriesOf(skill, player);
						return !cats.some(t => ["限定技", "觉醒技", "主公技"].includes(t));
					});
				});
				game.players.concat(game.dead).forEach(cur => {
					pool.remove(cur.name);
					pool.remove(cur.name1);
					pool.remove(cur.name2);
				});
				pool.removeArray(player.storage.wba_mofang);
				pool.randomSort();
				const gains = pool.slice(0, 2);
				if (gains.length) {
					player.storage.wba_mofang.addArray(gains);
					game.log(player, "获得了化身", ...gains.map(i => "#g" + get.translation(i)));
				}
			}
			const list = player.storage.wba_mofang.slice(0);
			if (!list.length) {
				return;
			}
			// 选择一张化身牌置于面前
			let character = list[0];
			if (list.length > 1) {
				const result = await player.chooseButton(["模仿：选择一张化身牌置于你面前", [list, "character"]], true).forResult();
				if (result && result.links && result.links.length) {
					character = result.links[0];
				}
			}
			// 声明该武将的一项技能（排除限定技/觉醒技/主公技）
			const skills = (get.character(character, 3) || []).filter(skill => {
				const info = get.info(skill);
				if (!info) {
					return false;
				}
				const cats = get.skillCategoriesOf(skill, player);
				return !cats.some(t => ["限定技", "觉醒技", "主公技"].includes(t));
			});
			if (skills.length) {
				let declared = skills[0];
				if (skills.length > 1) {
					const result2 = await player
						.chooseControl(skills)
						.set("dialog", ["模仿：声明“" + get.translation(character) + "”的一项技能", [[character], "character"]])
						.set("ai", () => skills.randomGet())
						.forResult();
					if (result2 && result2.control) {
						declared = result2.control;
					}
				}
				// 以“wba_mofang”为分组，重复声明会自动替换旧的声明技能
				await player.addAdditionalSkills("wba_mofang", declared);
			}
			// 性别与势力视为与该武将相同
			const sex = get.character(character, 0);
			const group = get.character(character, 1);
			game.broadcastAll(
				(player, character, sex, group) => {
					player.storage.wba_mofang_current = character;
					if (sex) {
						player.sex = sex;
					}
					if (group) {
						player.group = group;
						if (player.node && player.node.name) {
							player.node.name.dataset.nature = get.groupnature(group);
						}
					}
				},
				player,
				character,
				sex,
				group
			);
			game.log(player, "将化身替换为", "#g" + get.translation(character));
			player.markSkill("wba_mofang");
			// 视觉上把武将立绘替换为“化身”武将
			player.flashAvatar("wba_mofang", character);
		},
	},
	// 新生：你每受到1点伤害，可获得一张新化身牌。
	wba_xinsheng: {
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return event.num > 0;
		},
		getIndex(event) {
			return event.num;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_xinsheng")).forResult();
		},
		async content(event, trigger, player) {
			// 若“模仿”尚未初始化则先初始化数组
			if (!Array.isArray(player.storage.wba_mofang)) {
				player.storage.wba_mofang = [];
			}
			const pool = get.gainableCharacters((info, name) => {
				if (!Array.isArray(info[3]) || !info[3].length) {
					return false;
				}
				return info[3].some(skill => {
					const skillInfo = get.info(skill);
					if (!skillInfo) {
						return false;
					}
					const cats = get.skillCategoriesOf(skill, player);
					return !cats.some(t => ["限定技", "觉醒技", "主公技"].includes(t));
				});
			});
			game.players.concat(game.dead).forEach(cur => {
				pool.remove(cur.name);
				pool.remove(cur.name1);
				pool.remove(cur.name2);
			});
			pool.removeArray(player.storage.wba_mofang);
			pool.randomSort();
			if (pool.length) {
				player.storage.wba_mofang.add(pool[0]);
				game.log(player, "获得了新化身", "#g" + get.translation(pool[0]));
				player.markSkill("wba_mofang");
			}
		},
	},

	// ============================ 宋轶健 ============================
	// 学委：准备阶段进行判定，本回合中你每打出/使用一张与判定牌类别相同的牌，可摸一张牌。
	wba_xuewei: {
		trigger: { player: "phaseZhunbeiBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_xuewei")).forResult();
		},
		async content(event, trigger, player) {
			const result = await player.judge().forResult();
			// 记录判定牌类别（基本/锦囊/装备，延时锦囊归入锦囊）
			player.storage.wba_xuewei_type = get.type2(result.card);
			game.log(player, "本回合与", "#y" + get.translation(player.storage.wba_xuewei_type) + "牌", "类别相同的牌可令其摸牌");
			player.addTempSkill("wba_xuewei_effect", "phaseAfter");
		},
		subSkill: {
			effect: {
				trigger: { player: ["useCard", "respond"] },
				filter(event, player) {
					const type = player.storage.wba_xuewei_type;
					if (!type) {
						return false;
					}
					return event.card && get.type2(event.card) === type;
				},
				async cost(event, trigger, player) {
					event.result = await player.chooseBool("学委：是否摸一张牌？").forResult();
				},
				async content(event, trigger, player) {
					await player.draw();
				},
				onremove(player) {
					delete player.storage.wba_xuewei_type;
				},
				intro: { content: "本回合内与判定牌类别相同的牌可令其摸牌" },
			},
		},
	},
	// 不萎：限定技，当你失去全部手牌时，可立刻摸取X张牌（X为你当前的体力）。
	wba_buwei: {
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		trigger: { player: "loseEnd" },
		filter(event, player) {
			if (player.countCards("h") !== 0) {
				return false;
			}
			// 与标准包“空城”(kongcheng1) 同款判定：直接读取本次失去的牌是否包含原本在手牌区的牌，
			// 不依赖 getl()/getlx 的边缘语义，可在回合内外任何情况下可靠触发。
			return (event.cards || []).some(c => c.original === "h");
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_buwei")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			if (player.hp > 0) {
				await player.draw(player.hp);
			}
		},
	},

	// ============================ 徐家澍 ============================
	// cool：每当场上有一人受到伤害时，你可以感叹“cool”进行判定，若结果为红色则获得此判定牌。
	wba_cool: {
		trigger: { global: "damageEnd" },
		filter(event, player) {
			return event.num > 0 && event.player && event.player.isIn();
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_cool")).forResult();
		},
		async content(event, trigger, player) {
			player.say("cool");
			game.log(player, "感叹了一声", "#y“cool”");
			await player
				.judge()
				.set("callback", async event => {
					// 判定结果为红色则获得此判定牌
					if (event.judgeResult.color === "red" && get.position(event.card, true) === "o") {
						await player.gain({ cards: [event.card], animate: "gain2" });
					}
				})
				.forResult();
		},
	},
	// 吃饭看手机：你的所有延时性锦囊牌均可视为桃使用。
	wba_chifan: {
		enable: "chooseToUse",
		filterCard(card) {
			return get.type(card) === "delay";
		},
		viewAsFilter(player) {
			return player.hasCard(card => get.type(card) === "delay", "h");
		},
		position: "h",
		viewAs: { name: "tao" },
		prompt: "将一张延时锦囊牌当【桃】使用",
		check(card) {
			return 15 - get.value(card);
		},
		ai: { threaten: 1.5 },
	},

	// ============================ 徐施舟 ============================
	// 修仙：回合结束时你可以选择摸三张牌，若如此做你跳过下一回合。
	wba_xiuxian1: {
		trigger: { player: "phaseJieshuBegin" },
		group: ["wba_skipturn"],
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_xiuxian1")).forResult();
		},
		async content(event, trigger, player) {
			await player.draw(3);
			// 标记跳过下一回合（由 wba_skipturn 在下个回合开始前取消该回合）
			player.storage.wba_skipturn = true;
			game.log(player, "将跳过下一个回合");
		},
	},
	// 小眼：你的“杀”可以当“闪”使用/打出，“闪”可以当“杀”使用/打出。
	wba_xiaoyan: {
		group: ["wba_xiaoyan_sha", "wba_xiaoyan_shan"],
		subSkill: {
			// 闪当杀（输出为杀）
			sha: {
				enable: ["chooseToUse", "chooseToRespond"],
				filterCard: { name: "shan" },
				viewAs: { name: "sha" },
				viewAsFilter(player) {
					return player.hasCard(card => get.name(card) === "shan", "hs");
				},
				position: "hs",
				prompt: "将一张闪当杀使用或打出",
				check() {
					return 1;
				},
				ai: {
					respondSha: true,
					skillTagFilter(player) {
						return player.hasCard(card => get.name(card) === "shan", "hs");
					},
					order() {
						return get.order({ name: "sha" }) + 0.1;
					},
					useful: -1,
					value: -1,
				},
			},
			// 杀当闪（输出为闪）
			shan: {
				enable: ["chooseToRespond", "chooseToUse"],
				filterCard: { name: "sha" },
				viewAs: { name: "shan" },
				viewAsFilter(player) {
					return player.hasCard(card => get.name(card) === "sha", "hs");
				},
				position: "hs",
				prompt: "将一张杀当闪使用或打出",
				check() {
					return 1;
				},
				ai: {
					respondShan: true,
					skillTagFilter(player) {
						return player.hasCard(card => get.name(card) === "sha", "hs");
					},
					order: 4,
					useful: -1,
					value: -1,
				},
			},
		},
	},

	// ============================ 许盛杰 ============================
	// 修仙：你可以跳过弃牌阶段并摸一张牌，若如此做你跳过下一回合。
	wba_xiuxian2: {
		trigger: { player: "phaseDiscardBegin" },
		group: ["wba_skipturn"],
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_xiuxian2")).forResult();
		},
		async content(event, trigger, player) {
			// 在弃牌阶段开始时取消该阶段（跳过弃牌阶段）
			trigger.cancel();
			game.log(player, "跳过了", "#y弃牌阶段");
			await player.draw();
			// 标记跳过下一回合
			player.storage.wba_skipturn = true;
			game.log(player, "将跳过下一个回合");
		},
	},
	// 中二：限定技，当你陷入濒死阶段时，翻开牌堆上方的四张牌，并回复X点血（X为红色牌数）。
	wba_zhonger: {
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		trigger: { player: "dyingBegin" },
		filter(event, player) {
			return player === event.player;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_zhonger")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const cards = get.cards(4);
			await game.cardsGotoOrdering(cards);
			game.log(player, "翻开了牌堆顶的", cards);
			const num = cards.filter(card => get.color(card) === "red").length;
			game.log(player, "共翻出", "#y" + get.cnNumber(num), "张红色牌");
			if (num > 0) {
				await player.recover(num);
			}
			// 翻开的牌随后置入弃牌堆
			await game.cardsDiscard(cards);
		},
	},

	// ============================ 刘阳河 ============================
	// 非洲酋长：锁定技，你的红色牌、你的判定牌，均视为黑桃。
	// 简化说明：mod 为“拥有者作用域”，因此可覆盖“你的牌/你的判定牌”；
	// “别人对你使用的红色牌”不属于你所有、无法由 mod 覆盖，此处从略。
	wba_feizhou: {
		locked: true,
		// ①你的牌与你的判定牌视为黑桃（归属者作用域的 mod.suit）
		mod: {
			suit(card, suit) {
				if (suit === "heart" || suit === "diamond") {
					return "spade";
				}
			},
		},
		// ②别人对你使用的红色牌，也视为黑桃（mod 无法覆盖来袭牌，故在你成为目标时物理改写其花色）
		group: ["wba_feizhou_in"],
	},
	wba_feizhou_in: {
		charlotte: true,
		locked: true,
		forced: true,
		popup: false,
		sourceSkill: "wba_feizhou",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return event.card && get.color(event.card, false) === "red" && lib.suits.includes(event.card.suit);
		},
		async content(event, trigger, player) {
			// 把来袭红牌改写为黑桃（其颜色随花色变为黑色）
			trigger.card.suit = "spade";
			if (trigger.card.color) {
				trigger.card.color = "black";
			}
			game.log(trigger.card, "被", "#g【非洲酋长】", "视为", "#c黑桃");
		},
	},
	// 大河：出牌阶段限X次（X为已损失体力且至少为1），将黑色牌当“水淹七军”使用：
	// 目标其他角色选择——1.弃置装备区所有牌；2.受到你造成的1点伤害。
	wba_dahe: {
		enable: "phaseUse",
		filterCard(card) {
			return get.color(card) === "black";
		},
		position: "he",
		filter(event, player) {
			const limit = Math.max(1, player.maxHp - player.hp);
			return player.countSkill("wba_dahe") < limit && player.hasCard(card => get.color(card) === "black", "he");
		},
		filterTarget(card, player, target) {
			return player !== target;
		},
		check(card) {
			return 6 - get.value(card);
		},
		prompt: "将一张黑色牌当作“水淹七军”对一名其他角色使用",
		async content(event, trigger, player) {
			const target = event.target;
			const result = await target
				.chooseControl(["弃置装备区所有牌", "受到1点伤害"])
				.set("prompt", get.translation(player) + "对你发动【大河】，请选择一项")
				.set("ai", () => {
					const me = _status.event.player;
					const es = me.getCards("e");
					if (!es.length) {
						return "受到1点伤害";
					}
					// 简单AI：濒危时保命弃装备，否则一般宁愿弃装备也不受伤（可按需调整）
					if (me.hp <= 1) {
						return "弃置装备区所有牌";
					}
					return "受到1点伤害";
				})
				.forResult();
			if (result.control === "弃置装备区所有牌") {
				const es = target.getCards("e");
				if (es.length) {
					await target.discard(es);
				} else {
					game.log(target, "没有装备牌可弃置");
				}
			} else {
				await target.damage(player);
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

	// ============================ 宋沼 ============================
	// 装逼：回合结束阶段，你可以摸X张牌，然后增加1点体力上限
	// （X为场上手牌数不小于你的角色数）。
	wba_zhuangbi: {
		trigger: { player: "phaseJieshuBegin" },
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_zhuangbi")).forResult();
		},
		async content(event, trigger, player) {
			const num = game.countPlayer(cur => cur.countCards("h") >= player.countCards("h"));
			if (num > 0) {
				await player.draw(num);
			}
			await player.gainMaxHp();
		},
	},
	// 八天八夜：限定技，当你的手牌数不小于八张时，你的体力上限变为4，
	// 并失去技能“装逼”，获得技能“一向是第一”。
	wba_batian: {
		limited: true,
		skillAnimation: true,
		animationColor: "gray",
		derivation: ["wba_diyi"],
		trigger: { player: ["gainAfter", "drawAfter", "phaseZhunbeiBegin", "phaseJieshuBegin"] },
		filter(event, player) {
			return player.countCards("h") >= 8;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2("wba_batian")).forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			// 体力上限变为4
			const diff = player.maxHp - 4;
			if (diff > 0) {
				await player.loseMaxHp(diff);
			} else if (diff < 0) {
				await player.gainMaxHp(-diff);
			}
			// 失去“装逼”，获得“一向是第一”
			await player.removeSkills("wba_zhuangbi");
			await player.addSkills("wba_diyi");
		},
	},
	// 一向是第一：锁定技，回合结束阶段，若你不是场上手牌数最多的角色，
	// 你将手牌补至场上手牌数最多的角色的手牌数。
	wba_diyi: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			const max = Math.max(...game.filterPlayer().map(cur => cur.countCards("h")));
			return player.countCards("h") < max;
		},
		async content(event, trigger, player) {
			const max = Math.max(...game.filterPlayer().map(cur => cur.countCards("h")));
			const diff = max - player.countCards("h");
			if (diff > 0) {
				await player.draw(diff);
			}
		},
	},

	// ============================ 公共辅助技能 ============================
	// 跳过下一回合：由“修仙”标记 player.storage.wba_skipturn，在下个回合开始前取消该回合。
	// 通过 group 由两个“修仙”技能引入，不作为独立获得的技能显示。
	wba_skipturn: {
		trigger: { player: "phaseBeforeStart" },
		forced: true,
		popup: false,
		priority: 100,
		filter(event, player) {
			return player.storage.wba_skipturn === true;
		},
		async content(event, trigger, player) {
			player.storage.wba_skipturn = false;
			game.log(player, "跳过了", "#y此回合");
			trigger.cancel(null, null, "notrigger");
		},
	},
};

export const translate = {
	// —— 武将名 ——
	wba_qiuhaorong: "邱昊嵘",
	wba_songyijian: "宋轶健",
	wba_xujiashu: "徐家澍",
	wba_xushizhou: "徐施舟",
	wba_xushengjie: "许盛杰",
	wba_liuyanghe: "刘阳河",
	wba_songzhao: "宋沼",

	// —— 邱昊嵘 ——
	wba_mofang: "模仿",
	wba_mofang_info: "游戏开始时，你随机获得两张未加入游戏的武将牌，选择一张置于你面前并声明该武将的一项技能（不可声明限定技/觉醒技/主公技），你拥有该技能且性别与势力视为与该武将相同，直到化身被替换。你的每个回合开始时和结束后，你可以替换化身牌，并为新化身重新声明一项技能。",
	wba_xinsheng: "新生",
	wba_xinsheng_info: "你每受到1点伤害，可以获得一张新的化身牌（一个随机的未加入游戏的武将名）。",

	// —— 宋轶健 ——
	wba_xuewei: "学委",
	wba_xuewei_info: "准备阶段，你可以进行一次判定，本回合中你每打出或使用一张与判定牌类别相同的牌，你可以摸一张牌。",
	wba_xuewei_effect: "学委",
	wba_buwei: "不萎",
	wba_buwei_info: "限定技，当你失去全部手牌时，你可以立刻摸取X张牌（X为你当前的体力值）。",

	// —— 徐家澍 ——
	wba_cool: "cool",
	wba_cool_info: "每当场上有一名角色受到伤害后，你可以感叹“cool”并进行一次判定，若判定结果为红色，则你获得此判定牌。",
	wba_chifan: "吃饭看手机",
	wba_chifan_info: "你的所有延时性锦囊牌均可当作【桃】使用。",

	// —— 徐施舟 ——
	wba_xiuxian1: "修仙",
	wba_xiuxian1_info: "回合结束时，你可以选择摸三张牌，若如此做，你跳过你的下一个回合。",
	wba_xiaoyan: "小眼",
	wba_xiaoyan_info: "你可以将“杀”当作“闪”使用或打出，将“闪”当作“杀”使用或打出。",
	wba_xiaoyan_sha: "小眼",
	wba_xiaoyan_shan: "小眼",

	// —— 许盛杰 ——
	wba_xiuxian2: "修仙",
	wba_xiuxian2_info: "弃牌阶段开始时，你可以跳过此弃牌阶段并摸一张牌，若如此做，你跳过你的下一个回合。",
	wba_zhonger: "中二",
	wba_zhonger_info: "限定技，当你进入濒死阶段时，你可以翻开牌堆顶的四张牌，回复X点体力（X为其中红色牌的数量），然后将这些牌置入弃牌堆。",

	// —— 刘阳河 ——
	wba_feizhou: "非洲酋长",
	wba_feizhou_info: "锁定技，你的红色牌、别人对你使用的红色牌、你的判定牌，均视为黑桃。",
	wba_feizhou_in: "非洲酋长",
	wba_dahe: "大河",
	wba_dahe_info: "出牌阶段限X次（X为你已损失的体力值且至少为1），你可以将一张黑色牌当作“水淹七军”对一名其他角色使用，其选择一项：1.弃置装备区里的所有牌；2.受到你造成的1点伤害。",

	// —— 宋沼 ——
	wba_zhuangbi: "装逼",
	wba_zhuangbi_info: "回合结束阶段，你可以摸X张牌，然后增加1点体力上限（X为场上手牌数不小于你的角色数）。",
	wba_batian: "八天八夜",
	wba_batian_info: "限定技，当你的手牌数不小于八张时，你的体力上限变为4，并失去技能“装逼”，获得技能“一向是第一”。",
	wba_diyi: "一向是第一",
	wba_diyi_info: "锁定技，回合结束阶段，若你不是场上手牌数最多的角色，你将手牌补至场上手牌数最多的角色的手牌数。",

	// —— 辅助 ——
	wba_skipturn: "修仙",
};
