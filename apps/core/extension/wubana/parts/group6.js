import { lib, game, ui, get, ai, _status } from "noname";

// ============================================================
// 五班阿 扩展 —— 分组六（qun 群，10 名武将）
// 技能实现以“忠于中文描述”为第一原则，个别机制做了尽力实现并附注释。
// ============================================================

export const character = {
	// 1) 蔡晶君
	wba_caijingjun: { sex: "female", group: "shi", hp: 3, skills: ["wba_nalilai", "wba_naliqu"] },
	// 2) 高雯
	wba_gaowen: { sex: "female", group: "xue", hp: 3, skills: ["wba_kuangxiao", "wba_yusu"] },
	// 3) 朱敏惠
	wba_zhuminhui: { sex: "male", group: "shi", hp: 3, skills: ["wba_jingyan", "wba_shuxue"] },
	// 4) 田雨竹
	wba_tianyuzhu: { sex: "female", group: "xue", hp: 4, skills: ["wba_tuanzhi", "wba_tianshu"] },
	// 5) 徐薇
	wba_xuwei: { sex: "female", group: "shi", hp: 3, skills: ["wba_kouwu", "wba_jushou"] },
	// 6) 杜任娟
	wba_durenjuan: { sex: "female", group: "shi", hp: 8, skills: ["wba_faxing", "wba_xining", "wba_biede"] },
	// 7) 杨雨晨
	wba_yangyuchen: { sex: "female", group: "xue", hp: 4, skills: ["wba_wumi", "wba_shiwumi"] },
	// 8) 茅家俊
	wba_maojiajun: { sex: "male", group: "shi", hp: 4, skills: ["wba_duanlian", "wba_chengnian"] },
	// 9) 茅艳梅
	wba_mym: { sex: "female", group: "shi", hp: 3, skills: ["wba_kunqian", "wba_mizhinianling"] },
	// 10) 李安康
	wba_liankang: { sex: "male", group: "shi", hp: 4, skills: ["wba_liuziping", "wba_kanyixiazi"] },
};

export const skill = {
	// ==================== 1) 蔡晶君 ====================
	// 哪里来：当一名角色对你使用【杀】时，可判定，红色则视为闪避此杀（此杀对你无效）。
	// 机制参考标准版【流离】：从使用牌事件的目标中移除自己 => 该【杀】对你无效。
	wba_nalilai: {
		// “对你使用杀”=你为目标，故角色为 target；用 useCardToTarget（早于结算）方可令此杀对你无效
		trigger: { target: "useCardToTarget" },
		filter(event, player) {
			return event.card && event.card.name === "sha" && event.player !== player;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill, trigger.player)).set("ai", () => true).forResult();
		},
		async content(event, trigger, player) {
			const result = await player
				.judge({
					judge: card => (get.color(card) === "red" ? 2 : -2),
					judge2: res => res.bool,
				})
				.forResult();
			if (result.color === "red") {
				// 判定为红：视为闪避（令此杀对你无效）——参考标准版【流离】/【帷幕】的移除目标机制
				const evt = trigger.getParent();
				if (trigger.targets) trigger.targets.remove(player);
				if (evt && evt.targets && evt.targets !== trigger.targets) evt.targets.remove(player);
				if (evt && evt.triggeredTargets2) evt.triggeredTargets2.remove(player);
				trigger.untrigger();
				game.log(player, "视为闪避了", trigger.card);
			}
		},
	},
	// 哪里去：你使用的【杀】被【闪】抵消时，可判定，黑色则弃置该角色一张手牌。
	wba_naliqu: {
		trigger: { player: "shaMiss" },
		filter(event, player) {
			return event.target && event.target.isIn() && event.target.countCards("h") > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill, trigger.target)).set("ai", () => true).forResult();
		},
		logTarget: "target",
		async content(event, trigger, player) {
			const result = await player
				.judge({
					judge: card => (get.color(card) === "black" ? 2 : -2),
					judge2: res => res.bool,
				})
				.forResult();
			if (result.color === "black" && trigger.target.isIn() && trigger.target.countCards("h") > 0) {
				await player.discardPlayerCard(trigger.target, "h", true);
			}
		},
	},

	// ==================== 2) 高雯 ====================
	// 狂笑：限定技，弃一张黑色手牌，视为使用【南蛮入侵】和【万箭齐发】。
	wba_kuangxiao: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filterCard(card) {
			return get.color(card) === "black";
		},
		position: "h",
		filter(event, player) {
			return player.hasCard(card => get.color(card) === "black", "h");
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			// 选中的黑色手牌已作为消耗被弃置（active 技能默认行为）
			const nanman = get.autoViewAs({ name: "nanman", isCard: true });
			if (player.hasUseTarget(nanman)) await player.chooseUseTarget(nanman, true, false);
			const wanjian = get.autoViewAs({ name: "wanjian", isCard: true });
			if (player.hasUseTarget(wanjian)) await player.chooseUseTarget(wanjian, true, false);
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					return game.countPlayer(cur => cur !== player && get.attitude(player, cur) < 0) >= 2 ? 1 : 0;
				},
			},
		},
	},
	// 语速飞快：锁定技，你一回合内使用【杀】的次数无限制。
	wba_yusu: {
		locked: true,
		mod: {
			cardUsable(card, player, num) {
				if (card.name === "sha") return Infinity;
			},
		},
	},

	// ==================== 3) 朱敏惠 ====================
	// 经验主义者：一名其他角色因弃置失去至少两张手牌后，你可从其弃置的手牌中获得X张（X=弃牌数-1）。
	wba_jingyan: {
		getCards(event, player) {
			if (event.type !== "discard" || event.getlx === false) return [];
			const info = event.getl(event.player);
			if (!info) return [];
			// 因弃置而失去的“手牌”，且当前仍位于弃牌堆
			return (info.cards2 || []).filter(card => card.original === "h" && get.position(card, true) === "d");
		},
		trigger: { global: "loseAfter" },
		filter(event, player) {
			if (event.player === player) return false;
			return lib.skill.wba_jingyan.getCards(event, player).length >= 2;
		},
		async cost(event, trigger, player) {
			event.result = await player.chooseBool(get.prompt2(event.skill, trigger.player)).set("ai", () => true).forResult();
		},
		logTarget: "player",
		async content(event, trigger, player) {
			const cards = lib.skill.wba_jingyan.getCards(trigger, player);
			const num = cards.length - 1;
			if (num <= 0 || !cards.length) return;
			const result = await player
				.chooseButton(["经验主义者：获得其中" + get.cnNumber(num) + "张牌", cards], [num, num])
				.set("ai", button => get.value(button.link))
				.forResult();
			if (result.bool && result.links && result.links.length) {
				await player.gain(result.links, "gain2");
			}
		},
	},
	// 数学爱好者：出牌阶段限一次，与一名其他角色拼点，赢则本回合攻击范围+1、使用【杀】次数上限+1。
	wba_shuxue: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player !== target && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const result = await player.chooseToCompare(event.target).forResult();
			if (result.bool) {
				player.addTempSkill("wba_shuxue_effect", "phaseUseAfter");
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					if (!player.canCompare(target)) return 0;
					const hs = player.getCards("h");
					const max = hs.length ? Math.max(...hs.map(c => get.number(c))) : 0;
					return max >= 10 ? 1 : 0;
				},
			},
		},
		subSkill: {
			effect: {
				charlotte: true,
				mark: true,
				intro: { content: "本回合攻击范围+1，使用【杀】的次数上限+1" },
				mod: {
					attackRange(player, num) {
						return num + 1;
					},
					cardUsable(card, player, num) {
						if (card.name === "sha") return num + 1;
					},
				},
			},
		},
	},

	// ==================== 4) 田雨竹 ====================
	// 团支书：你每受到1点伤害后，可指定一名角色，你与其各摸一张牌。
	wba_tuanzhi: {
		trigger: { player: "damageEnd" },
		getIndex(event) {
			return event.num || 1;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt2(event.skill),
					filterTarget: (card, player, target) => true,
					ai(target) {
						return get.attitude(get.player(), target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target);
			const list = [player, target].filter((v, i, a) => a.indexOf(v) === i);
			await game.asyncDraw(list.sortBySeat());
			await game.delayx();
		},
	},
	// 田鼠：视为技，你的方片牌可当【顺手牵羊】使用。
	wba_tianshu: {
		enable: "chooseToUse",
		filter(event, player) {
			return player.hasCards("hes", { suit: "diamond" });
		},
		filterCard(card) {
			return get.suit(card) === "diamond";
		},
		position: "hes",
		viewAs: { name: "shunshou" },
		prompt: "将一张方片牌当【顺手牵羊】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 8, result: { target(player, target) { return -1; } } },
	},

	// ==================== 5) 徐薇 ====================
	// 口误：你使用【杀】指定其他角色为目标时，无视其防具；且你不会成为【借刀杀人】的目标。
	wba_kouwu: {
		trigger: { player: "useCardToPlayered" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card && event.card.name === "sha" && event.target !== player;
		},
		async content(event, trigger, player) {
			// 无视防具（青釭剑“破防”机制）
			trigger.target.addTempSkill("qinggang2");
			trigger.target.storage.qinggang2.add(trigger.card);
			trigger.target.markSkill("qinggang2");
		},
		mod: {
			// 拥有者作为目标时才生效（targetEnabled 按 target 的 mod 计算）
			targetEnabled(card, player, target) {
				if (card.name === "jiedao") return false;
			},
		},
	},
	// 拒收：出牌阶段限一次，指定一名其他角色，抽取其一张手牌，或视为对其使用一张【杀】。
	wba_jushou: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player !== target;
		},
		async content(event, trigger, player) {
			const target = event.target;
			let index = 1;
			if (target.countCards("h") > 0) {
				const result = await player
					.chooseControl({
						choiceList: ["抽取其一张手牌", "视为对其使用一张【杀】"],
						choice: get.attitude(player, target) < 0 ? 1 : 0,
					})
					.set("prompt", "拒收：选择对 " + get.translation(target) + " 的操作")
					.forResult();
				index = result.index;
			}
			if (index === 0) {
				await player.gainPlayerCard(target, "h", true);
			} else {
				await player.useCard({ name: "sha", isCard: true }, target, false);
			}
		},
		ai: {
			order: 7,
			result: {
				target(player, target) {
					return get.effect(target, { name: "sha" }, player, player) < 0 ? -1 : -0.5;
				},
			},
		},
	},

	// ==================== 6) 杜任娟 ====================
	// 发型崩坏：每当你的回合结束时，若你体力值为场上最高，你须减1点体力或1点体力上限。
	wba_faxing: {
		trigger: { player: "phaseJieshuBegin" },
		forced: true,
		filter(event, player) {
			return player.isAlive() && !game.hasPlayer(cur => cur !== player && cur.hp > player.hp);
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseControl({
					choiceList: ["减少1点体力", "减少1点体力上限"],
					choice: player.hp > 1 ? 0 : 1,
				})
				.set("prompt", "发型崩坏：选择减少1点体力或1点体力上限")
				.forResult();
			if (result.index === 1) {
				await player.loseMaxHp();
			} else {
				await player.loseHp();
			}
		},
	},
	// 侬则西宁：锁定技，你使用【杀】无距离限制。
	wba_xining: {
		locked: true,
		mod: {
			targetInRange(card, player, target) {
				if (card.name === "sha") return true;
			},
		},
	},
	// 还有别的伐：视为技，你可以将黑桃牌当【铁索连环】使用。
	wba_biede: {
		enable: "chooseToUse",
		filter(event, player) {
			return player.hasCards("hes", { suit: "spade" });
		},
		filterCard(card) {
			return get.suit(card) === "spade";
		},
		position: "hes",
		viewAs: { name: "tiesuo" },
		// 【铁索连环】来自 extra 卡包；若运行环境未加载该牌，则 lib.card.tiesuo 为空。
		// 此时应让技能不可用而非在 phaseUse 的 filterEnable 里对空 info 抛错（会导致无法进入出牌阶段）。
		viewAsFilter() {
			return Boolean(lib.card.tiesuo);
		},
		prompt: "将一张黑桃牌当【铁索连环】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { order: 6 },
	},

	// ==================== 7) 杨雨晨 ====================
	// 五米巨大化：限定技，指定一名角色（含自己），令其回复2点体力。
	wba_wumi: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "green",
		filterTarget(card, player, target) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			await event.target.recover(2);
		},
		ai: {
			order: 10,
			result: {
				target(player, target) {
					if (get.attitude(player, target) <= 0) return 0;
					return Math.min(2, target.maxHp - target.hp);
				},
			},
		},
	},
	// 十五米巨大化：主动技，出牌阶段你可以失去1点体力，视为对全场任意一名角色使用一张
	// 无距离限制、无视防具且伤害+1的【杀】。（每次使用失去1点体力，可反复使用）
	wba_shiwumi: {
		enable: "phaseUse",
		filter(event, player) {
			return player.hp >= 1 && game.hasPlayer(cur => player.canUse({ name: "sha", isCard: true }, cur, false));
		},
		async content(event, trigger, player) {
			const result = await player
				.chooseTarget("十五米巨大化：失去1点体力，视为对其使用一张无距离限制、无视防具且伤害+1的【杀】", (card, p, target) => p.canUse({ name: "sha", isCard: true }, target, false))
				.set("ai", target => {
					const p = get.player();
					if (p.hp <= 1) {
						return 0;
					}
					return get.effect(target, { name: "sha", isCard: true }, p, p);
				})
				.forResult();
			if (!result || !result.bool || !result.targets || !result.targets.length) {
				return;
			}
			const target = result.targets[0];
			await player.loseHp();
			const card = get.autoViewAs({ name: "sha", isCard: true });
			// 无视防具
			target.addTempSkill("qinggang2");
			if (!Array.isArray(target.storage.qinggang2)) {
				target.storage.qinggang2 = [];
			}
			target.storage.qinggang2.add(card);
			target.markSkill("qinggang2");
			// 伤害+1（用临时子技能，命中此杀时 +1）
			player.addTempSkill("wba_shiwumi_buff");
			if (!Array.isArray(player.storage.wba_shiwumi_buff)) {
				player.storage.wba_shiwumi_buff = [];
			}
			player.storage.wba_shiwumi_buff.add(card);
			// false：无距离限制、不计入使用次数（可反复使用）
			await player.useCard(card, target, false);
		},
		ai: {
			order: 8,
			result: {
				player(player) {
					return player.hp > 1 ? 0.6 : 0;
				},
			},
		},
	},
	wba_shiwumi_buff: {
		charlotte: true,
		forced: true,
		popup: false,
		trigger: { source: "damageBegin1" },
		filter(event, player) {
			return event.card && player.getStorage("wba_shiwumi_buff").includes(event.card);
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	// ==================== 8) 茅家俊 ====================
	// 自主锻炼：视为技，你可以将红桃牌当【乐不思蜀】使用。
	wba_duanlian: {
		enable: "chooseToUse",
		filter(event, player) {
			return player.hasCards("hes", { suit: "heart" });
		},
		filterCard(card) {
			return get.suit(card) === "heart";
		},
		position: "hes",
		viewAs: { name: "lebu" },
		prompt: "将一张红桃牌当【乐不思蜀】使用",
		check(card) {
			return 6 - get.value(card);
		},
		ai: { threaten: 1.5 },
	},
	// 大家都是成年人：锁定技，场上每有一名体力值大于你的角色，你的手牌上限+1。
	wba_chengnian: {
		locked: true,
		mod: {
			maxHandcard(player, num) {
				return num + game.countPlayer(cur => cur !== player && cur.hp > player.hp);
			},
		},
		mark: true,
		intro: { content: "锁定技，场上每有一名体力值大于你的角色，手牌上限+1" },
	},

	// ==================== 9) mym ====================
	// 课前训话：出牌阶段限一次，交给一名其他角色一张基本牌，然后其展示一张其他手牌：
	// 若该牌点数小于你交给的牌，你摸一张牌；否则其可视为对除你以外的一名角色使用一张【杀】。
	wba_kunqian: {
		enable: "phaseUse",
		usable: 1,
		filterCard(card) {
			return get.type(card) === "basic";
		},
		position: "h",
		discard: false,
		lose: false,
		filter(event, player) {
			return player.hasCard(card => get.type(card) === "basic", "h") && game.hasPlayer(cur => cur !== player);
		},
		filterTarget(card, player, target) {
			return player !== target;
		},
		check(card) {
			return 6 - get.value(card);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const givenNum = get.number(event.cards[0]);
			await player.give(event.cards, target);
			if (target.countCards("h", card => !event.cards.includes(card)) <= 0) return;
			const result = await target
				.chooseCard("h", true, card => !_status.event.givenCards.includes(card))
				.set("givenCards", event.cards.slice())
				.set("prompt", "课前训话：展示一张其他手牌")
				.forResult();
			if (!result.bool || !result.cards || !result.cards.length) return;
			const shown = result.cards[0];
			await target.showCards(result.cards, get.translation(target) + "展示的手牌");
			if (get.number(shown) < givenNum) {
				await player.draw();
			} else {
				const sha = { name: "sha", isCard: true };
				if (game.hasPlayer(cur => cur !== player && cur !== target && target.canUse(sha, cur))) {
					const res = await target
						.chooseTarget("课前训话：可视为对除 " + get.translation(player) + " 以外的一名角色使用一张【杀】", (card, p, t) => {
							return t !== _status.event.excludeTarget && p.canUse({ name: "sha", isCard: true }, t);
						})
						.set("excludeTarget", player)
						.set("ai", t => target.getUseValue ? get.effect(t, { name: "sha", isCard: true }, target, target) : -get.attitude(target, t))
						.forResult();
					if (res.bool && res.targets && res.targets.length) {
						await target.useCard({ name: "sha", isCard: true }, res.targets[0], false);
					}
				}
			}
		},
		ai: {
			order: 3,
			result: {
				target(player, target) {
					return 0.5;
				},
			},
		},
	},
	// 迷之年龄：锁定技，你的手牌上限始终等于你的体力上限；其他角色无法知晓你的体力值。
	// 说明：“隐藏体力值”涉及 UI 层面较难实现，此处从略；仅实现手牌上限=体力上限。
	wba_mizhinianling: {
		locked: true,
		mod: {
			maxHandcard(player, num) {
				return player.maxHp;
			},
		},
		mark: true,
		intro: { content: "锁定技，手牌上限等于体力上限；其他角色无法知晓你的真实体力值" },
		// 隐藏体力：在“非本人视角”的客户端上，把体力显示伪装成满血
		init(player) {
			if (player._wbaHideHpPatched) {
				return;
			}
			player._wbaHideHpPatched = true;
			const proto = Object.getPrototypeOf(player);
			const orig = proto && proto.$update;
			if (typeof orig !== "function") {
				return;
			}
			player.$update = function () {
				orig.apply(this, arguments);
				try {
					// 仅在“别人的视角”隐藏；本人（game.me）与录像正常显示
					if (this === game.me || _status.video || !this.hasSkill("wba_mizhinianling")) {
						return;
					}
					if (this.storage.nohp || !this.node || !this.node.hp) {
						return;
					}
					const hp = this.node.hp;
					const maxHp = this.maxHp;
					if (hp.classList.contains("textstyle") || hp.classList.contains("text")) {
						// 数字模式：显示为 满/满
						hp.innerHTML = maxHp + "<br>/<br>" + maxHp + "<div></div>";
					} else if (hp.childNodes && hp.childNodes.length) {
						// 红心模式：全部点亮，伪装成满血
						for (const node of hp.childNodes) {
							if (node.classList) {
								node.classList.remove("lost");
							}
						}
					}
				} catch (e) {
					/* ignore */
				}
			};
			if (typeof player.update === "function") {
				player.update();
			}
		},
	},

	// ==================== 10) 李安康 ====================
	// 你是刘子平：限定技，指定一名角色成为“刘子平”；此后你的准备阶段可弃一张牌令其下个摸牌阶段少摸一张；
	// “刘子平”死亡时其手牌与装备牌交给你。
	wba_liuziping: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "orange",
		filterTarget(card, player, target) {
			return true;
		},
		async content(event, trigger, player) {
			player.awakenSkill(event.name);
			const target = event.target;
			player.storage.wba_liuziping = target;
			target.addSkill("wba_liuziping_mark");
			player.addSkill("wba_liuziping_effect");
			player.addSkill("wba_liuziping_die");
			game.log(target, "成为了", "#g“刘子平”");
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return get.attitude(player, target) < 0 ? -2 : -0.1;
				},
			},
		},
		subSkill: {
			// 目标身上的“刘子平”标记
			mark: {
				marktext: "平",
				intro: { name: "刘子平", content: "你被指定为“刘子平”" },
			},
			// 令“刘子平”下个摸牌阶段少摸牌（挂在目标身上）
			less: {
				trigger: { player: "phaseDrawBegin" },
				forced: true,
				filter(event, player) {
					return !event.numFixed && player.countMark("wba_liuziping_less") > 0;
				},
				onremove: true,
				async content(event, trigger, player) {
					trigger.num -= player.countMark("wba_liuziping_less");
					if (trigger.num < 0) trigger.num = 0;
					player.removeSkill("wba_liuziping_less");
				},
				intro: { content: "下个摸牌阶段少摸#张牌" },
			},
			// 你的准备阶段：弃一张牌令“刘子平”下个摸牌阶段少摸一张
			effect: {
				trigger: { player: "phaseZhunbeiBegin" },
				filter(event, player) {
					const t = player.storage.wba_liuziping;
					return t && t.isIn() && player.countCards("he") > 0;
				},
				async cost(event, trigger, player) {
					const t = player.storage.wba_liuziping;
					event.result = await player
						.chooseToDiscard(1, "he", "是否弃置一张牌，令“刘子平”（" + get.translation(t) + "）下个摸牌阶段少摸一张牌？")
						.set("logSkill", ["wba_liuziping_effect", t])
						.forResult();
				},
				async content(event, trigger, player) {
					const t = player.storage.wba_liuziping;
					if (t && t.isIn()) {
						t.addSkill("wba_liuziping_less");
						t.addMark("wba_liuziping_less", 1, false);
					}
				},
			},
			// “刘子平”死亡时，其手牌与装备牌交给你（在 dieBegin 抢在弃置之前获取）
			die: {
				trigger: { global: "dieBegin" },
				forced: true,
				filter(event, player) {
					return event.player === player.storage.wba_liuziping && event.player !== player;
				},
				async content(event, trigger, player) {
					const target = event.player;
					if (target.countCards("he") > 0) {
						await player.gainMultiple([target], "he");
					}
					player.storage.wba_liuziping = null;
				},
			},
		},
	},
	// 你们看一下子：判定牌生效后可置于武将牌上称为“v-t图”；每当“v-t图”达四的倍数，可弃X张牌令一名角色失去1点体力（X为其体力值）。
	wba_kanyixiazi: {
		trigger: { player: "judgeEnd" },
		frequent: true,
		filter(event, player) {
			return event.result && event.result.card && get.position(event.result.card, true) === "o";
		},
		async content(event, trigger, player) {
			const card = trigger.result.card;
			if (get.position(card, true) === "o") {
				const next = player.addToExpansion([card], player, "gain2");
				next.gaintag.add("wba_vt");
				await next;
			}
			const count = player.getExpansions("wba_vt").length;
			if (count > 0 && count % 4 === 0) {
				const result = await player
					.chooseTarget("你们看一下子：是否弃置X张牌并令一名角色失去1点体力？（X为其体力值）", (card, p, t) => {
						return p.countCards("he") >= t.hp;
					})
					.set("ai", t => -get.attitude(get.player(), t))
					.forResult();
				if (result.bool && result.targets && result.targets.length) {
					const t = result.targets[0];
					player.line(t);
					game.log(player, "选择令", t, "失去1点体力");
					await player.chooseToDiscard(t.hp, "he", true);
					await t.loseHp();
				}
			}
		},
		intro: { content: "expansion", markcount: "expansion" },
	},
};

export const translate = {
	// —— 武将名 ——
	wba_caijingjun: "蔡晶君",
	wba_gaowen: "高雯",
	wba_zhuminhui: "朱敏惠",
	wba_tianyuzhu: "田雨竹",
	wba_xuwei: "徐薇",
	wba_durenjuan: "杜任娟",
	wba_yangyuchen: "杨雨晨",
	wba_maojiajun: "茅家俊",
	wba_mym: "茅艳梅",
	wba_liankang: "李安康",

	// —— 技能名 & 描述 ——
	wba_nalilai: "哪里来",
	wba_nalilai_info: "当一名角色对你使用【杀】时，你可以进行一次判定，若结果为红色，则你视为已经闪避此【杀】（此【杀】对你无效）。",
	wba_naliqu: "哪里去",
	wba_naliqu_info: "当你使用的【杀】被一名角色的【闪】抵消时，你可以进行一次判定，若结果为黑色，则你可以弃置该角色一张手牌。",

	wba_kuangxiao: "狂笑",
	wba_kuangxiao_info: "限定技，出牌阶段，你可以弃置一张黑色手牌，视为你使用了一张【南蛮入侵】和一张【万箭齐发】。",
	wba_yusu: "语速飞快",
	wba_yusu_info: "锁定技，你于一回合内使用【杀】的次数无限制。",

	wba_jingyan: "经验主义者",
	wba_jingyan_info: "当一名其他角色因弃置而失去至少两张手牌后，你可以从其弃置的手牌中获得X张（X为其弃置的手牌数减一）。",
	wba_shuxue: "数学爱好者",
	wba_shuxue_info: "出牌阶段限一次，你可以与一名其他角色拼点，若你赢，则本回合内你的攻击范围+1，且使用【杀】的次数上限+1。",
	wba_shuxue_effect: "数学爱好者",

	wba_tuanzhi: "团支书",
	wba_tuanzhi_info: "当你每受到1点伤害后，你可以指定一名角色，你与其各摸一张牌。",
	wba_tianshu: "田鼠",
	wba_tianshu_info: "视为技，你可以将一张方片牌当【顺手牵羊】使用。",

	wba_kouwu: "口误",
	wba_kouwu_info: "当你使用【杀】指定一名其他角色为目标时，你无视其防具；且你不会成为【借刀杀人】的目标。",
	wba_jushou: "拒收",
	wba_jushou_info: "出牌阶段限一次，你可以指定一名其他角色，抽取其一张手牌，或视为对其使用一张【杀】。",

	wba_faxing: "发型崩坏",
	wba_faxing_info: "每当你的回合结束时，若你的体力值为场上最高，你须减少1点体力或1点体力上限。",
	wba_xining: "侬则西宁",
	wba_xining_info: "锁定技，你使用【杀】无距离限制。",
	wba_biede: "还有别的伐",
	wba_biede_info: "视为技，你可以将一张黑桃牌当【铁索连环】使用。",

	wba_wumi: "五米巨大化",
	wba_wumi_info: "限定技，出牌阶段，你可以指定一名角色（含你自己），令其回复2点体力。",
	wba_shiwumi: "十五米巨大化",
	wba_shiwumi_info: "出牌阶段，你可以失去1点体力，视为对全场任意一名角色使用一张无距离限制、无视防具且伤害+1的【杀】（可反复发动）。",
	wba_shiwumi_buff: "十五米巨大化",

	wba_duanlian: "自主锻炼",
	wba_duanlian_info: "视为技，你可以将一张红桃牌当【乐不思蜀】使用。",
	wba_chengnian: "大家都是成年人",
	wba_chengnian_info: "锁定技，场上每有一名体力值大于你的角色，你的手牌上限便+1。",

	wba_kunqian: "课前训话",
	wba_kunqian_info: "出牌阶段限一次，你可以交给一名其他角色一张基本牌，然后其展示一张其他手牌：若该牌点数小于你交给的牌，你摸一张牌；否则其可以视为对除你以外的一名角色使用一张【杀】。",
	wba_mizhinianling: "迷之年龄",
	wba_mizhinianling_info: "锁定技，你的手牌上限始终等于你的体力上限；其他角色无法知晓你的体力值。",

	wba_liuziping: "你是刘子平",
	wba_liuziping_info: "限定技，出牌阶段，你可以指定一名角色成为“刘子平”。此后你的准备阶段，你可以弃置一张牌，令“刘子平”下个摸牌阶段少摸一张牌；“刘子平”死亡时，其手牌与装备牌均交给你。",
	wba_liuziping_mark: "刘子平",
	wba_liuziping_less: "你是刘子平",
	wba_liuziping_effect: "你是刘子平",
	wba_liuziping_die: "你是刘子平",
	wba_kanyixiazi: "你们看一下子",
	wba_kanyixiazi_info: "你的判定牌生效后，你可以将其置于武将牌上，称为“v-t图”；每当你拥有的“v-t图”数量达到四的倍数时，你可以弃置X张牌并令一名角色失去1点体力（X为该角色的体力值）。",
};
