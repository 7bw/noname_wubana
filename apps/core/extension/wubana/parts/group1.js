import { lib, game, ui, get, ai, _status } from "noname";

export const character = {
	wba_sp_hezhizhao: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_nongfu", "wba_lvdongbin", "wba_gouwanglei"],
	},
	wba_sp_xujiashu: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_bolan", "wba_zifen"],
	},
	wba_sp_songyijian: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_tuili", "wba_mingduan"],
	},
	wba_sp_huangyanrui: {
		sex: "male",
		group: "xue",
		hp: 3,
		skills: ["wba_cunliang", "wba_bushi", "wba_shizong"],
	},
};

export const skill = {
	// ========== sp何智昭 ==========
	// 农夫与蛇
	wba_nongfu: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					return 5 - get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "green");
			game.log(target, "成为了", player, "的", "#g蛇");
			player.addTempSkill("wba_nongfu_effect", { player: "phaseBegin" });
			player.markAuto("wba_nongfu_effect", [target]);
		},
	},
	wba_nongfu_effect: {
		charlotte: true,
		onremove: true,
		frequent: true,
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			return player.getStorage("wba_nongfu_effect").includes(event.player);
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		intro: {
			content(storage) {
				return "“蛇”：" + get.translation(storage);
			},
		},
	},
	// 吕洞宾与狗
	wba_lvdongbin: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(current => current != player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2(event.skill), lib.filter.notMe)
				.set("ai", target => {
					return 5 - get.attitude(get.player(), target);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target, "green");
			game.log(target, "成为了", player, "的", "#g狗");
			player.addTempSkill("wba_lvdongbin_effect", { player: "phaseAfter" });
			player.markAuto("wba_lvdongbin_effect", [target]);
		},
	},
	wba_lvdongbin_effect: {
		charlotte: true,
		onremove: true,
		frequent: true,
		trigger: { global: "respond" },
		filter(event, player) {
			if (!player.getStorage("wba_lvdongbin_effect").includes(event.player)) {
				return false;
			}
			const evt = event.getParent("useCard");
			return evt && evt.card && evt.player == player && Array.isArray(evt.targets) && evt.targets.includes(event.player);
		},
		async content(event, trigger, player) {
			await player.draw();
		},
		intro: {
			content(storage) {
				return "“狗”：" + get.translation(storage);
			},
		},
	},
	// 我与够汪磊
	wba_gouwanglei: {
		trigger: { player: "die" },
		forced: true,
		locked: true,
		forceDie: true,
		filter(event, player) {
			return event.source && event.source.isIn() && event.source != player;
		},
		async content(event, trigger, player) {
			// content 里 event 是技能事件、trigger 才是死亡事件，凶手在 trigger.source
			const source = trigger.source;
			if (!source || !source.isIn()) {
				return;
			}
			const skills = source.getSkills(null, false, false).filter(skill => {
				const info = get.info(skill);
				return info && !info.charlotte && get.is.locked(skill, source) == false;
			});
			if (skills.length) {
				await source.removeSkills(skills);
			}
			source.addSkill("wba_gouwanglei_mark");
			source.markSkill("wba_gouwanglei_mark");
			game.log(source, "成为了", "#y够汪磊", "，失去了所有非锁定技能");
		},
	},
	wba_gouwanglei_mark: {
		locked: true,
		mark: true,
		marktext: "够",
		intro: {
			name: "够汪磊",
			content: "已成为“够汪磊”，失去所有非锁定技能直到游戏结束",
		},
	},
	// ========== sp徐家澍 ==========
	// 博览
	wba_bolan: {
		trigger: { player: "phaseDrawBegin" },
		forced: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.changeToZero();
			const cards = get.cards(4, true);
			await player.showCards(cards, get.translation(player) + "发动了【博览】");
			const result = await player
				.chooseButton(["博览：获得其中点数之和不大于13的任意张牌", cards])
				.set("selectButton", [0, cards.length])
				.set("filterButton", button => {
					let sum = get.number(button.link) || 0;
					for (const selected of ui.selected.buttons) {
						sum += get.number(selected.link) || 0;
					}
					return sum <= 13;
				})
				.set("ai", button => {
					return get.value(button.link);
				})
				.forResult();
			if (result.bool && result.links && result.links.length) {
				await player.gain(result.links, "gain2");
			}
		},
	},
	// 自焚
	wba_zifen: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		filter(event, player) {
			return !player.awakenedSkills.includes("wba_zifen") && game.hasPlayer(current => current != player);
		},
		async content(event, trigger, player) {
			player.awakenSkill("wba_zifen");
			await player.loseHp();
			const targets = game.filterPlayer(current => current != player).sortBySeat(player);
			let lastDiscardNum = 0;
			for (const target of targets) {
				if (!target.isIn()) {
					continue;
				}
				const num = lastDiscardNum > 0 ? lastDiscardNum + 1 : 1;
				const canDiscard = target.countCards("he") >= num;
				let index;
				if (canDiscard) {
					let aiChoice = 0;
					if (target.hp > 2 && (num >= 3 || target.countCards("he") <= num)) {
						aiChoice = 1;
					}
					const result = await target
						.chooseControl({
							choiceList: ["弃置至少" + get.cnNumber(num) + "张牌", "受到" + get.translation(player) + "造成的2点火焰伤害"],
							choice: aiChoice,
						})
						.set("prompt", "自焚：请选择一项")
						.forResult();
					index = result.index;
				} else {
					index = 1;
				}
				if (index == 0) {
					const dresult = await target.chooseToDiscard([num, Infinity], "he", true).forResult();
					lastDiscardNum = dresult.cards ? dresult.cards.length : num;
				} else {
					lastDiscardNum = 0;
					await target.damage(2, "fire", player);
				}
			}
		},
		ai: {
			order: 1,
			result: {
				player(player) {
					if (player.hp <= 1) {
						return 0;
					}
					const enemies = game.countPlayer(current => current != player && get.attitude(player, current) < 0);
					return enemies >= 2 ? enemies : 0;
				},
			},
		},
	},
	// ========== sp宋轶健 ==========
	// 推理
	wba_tuili: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return player != target && player.canCompare(target);
		},
		async content(event, trigger, player) {
			const target = event.target;
			const result = await player.chooseToCompare(target).forResult();
			if (result.bool) {
				// 该角色本回合所有非锁定技失效
				target.addTempSkill("wba_tuili_disable");
				// 你计算至该角色的距离视为1
				player.addTempSkill("wba_tuili_distance", { player: "phaseAfter" });
				player.markAuto("wba_tuili_distance", [target]);
				// 本回合内你对其使用的杀被闪抵消时，可弃置其一张手牌
				player.addTempSkill("wba_tuili_sha", { player: "phaseAfter" });
				player.markAuto("wba_tuili_sha", [target]);
			}
		},
		ai: {
			order: 4,
			result: {
				target(player, target) {
					return -1;
				},
			},
		},
	},
	wba_tuili_disable: {
		charlotte: true,
		locked: true,
		mark: true,
		marktext: '<span style="text-decoration: line-through;">推</span>',
		init(player, skill) {
			player.addSkillBlocker(skill);
		},
		onremove(player, skill) {
			player.removeSkillBlocker(skill);
		},
		skillBlocker(skill, player) {
			const info = get.info(skill);
			return info && !info.charlotte && !info.persevereSkill && get.is.locked(skill, player) == false;
		},
		intro: {
			content: "本回合非锁定技失效",
		},
	},
	wba_tuili_distance: {
		charlotte: true,
		onremove: true,
		mod: {
			globalFrom(from, to, distance) {
				if (from.getStorage("wba_tuili_distance").includes(to)) {
					return 1;
				}
			},
		},
		intro: {
			content(storage) {
				return "你计算至" + get.translation(storage) + "的距离视为1";
			},
		},
	},
	wba_tuili_sha: {
		charlotte: true,
		onremove: true,
		trigger: { global: "respond" },
		filter(event, player) {
			if (get.name(event.card) != "shan") {
				return false;
			}
			if (!player.getStorage("wba_tuili_sha").includes(event.player)) {
				return false;
			}
			if (!event.player.countCards("h")) {
				return false;
			}
			const evt = event.getParent("useCard");
			return evt && evt.card && evt.card.name == "sha" && evt.player == player && Array.isArray(evt.targets) && evt.targets.includes(event.player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("推理：是否弃置" + get.translation(trigger.player) + "的一张手牌？")
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discardPlayerCard(trigger.player, "h", true);
		},
		intro: {
			content(storage) {
				return "本回合你对" + get.translation(storage) + "使用的【杀】被【闪】抵消时，可弃置其一张手牌";
			},
		},
	},
	// 明断
	wba_mingduan: {
		enable: "chooseToUse",
		filterCard(card) {
			return get.color(card) == "black";
		},
		position: "hs",
		viewAs: { name: "wuxie" },
		viewAsFilter(player) {
			return player.countCards("hs", { color: "black" }) > 0;
		},
		prompt: "将一张黑色牌当作无懈可击使用",
		check(card) {
			return 1 - get.value(card) / 10;
		},
	},
	// ========== sp黄彦瑞 ==========
	// 存粮
	wba_cunliang: {
		trigger: { player: "phaseDrawBegin" },
		filter(event, player) {
			return player.getExpansions("wba_liang").length == 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2(event.skill))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw(2);
			if (!player.countCards("h")) {
				return;
			}
			const result = await player
				.chooseCard("h", [0, Infinity], "存粮：可将任意数量的手牌置于武将牌上，称为“粮”")
				.set("ai", card => {
					return 4 - get.value(card);
				})
				.forResult();
			if (result.bool && result.cards && result.cards.length) {
				const next = player.addToExpansion(result.cards, player, "give");
				next.gaintag.add("wba_liang");
				await next;
			}
		},
		mod: {
			targetEnabled(card, player, target) {
				if (card.name == "bingliang" && player != target) {
					if ([player.name, player.name1, player.name2].includes("wba_caijingjun")) {
						return;
					}
					return false;
				}
			},
		},
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
	},
	// 布施
	wba_bushi: {
		trigger: { global: "phaseJieshuBegin" },
		logTarget: "player",
		filter(event, player) {
			return player.getExpansions("wba_liang").length > 0 && event.player.countCards("h") < event.player.hp;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("布施：是否移去一张“粮”，令" + get.translation(trigger.player) + "摸两张牌？")
				.set("ai", () => get.attitude(player, trigger.player) > 0)
				.forResult();
		},
		async content(event, trigger, player) {
			const liang = player.getExpansions("wba_liang");
			if (liang.length) {
				await player.loseToDiscardpile(liang[0]);
			}
			await trigger.player.draw(2);
		},
	},
	// 失踪
	wba_shizong: {
		skillAnimation: true,
		animationColor: "gray",
		trigger: { player: "phaseZhunbeiBegin" },
		forced: true,
		derivation: ["wba_fakeyou", "wba_nibaba"],
		filter(event, player) {
			return player.hp == 1 && player.getExpansions("wba_liang").length == 0;
		},
		async content(event, trigger, player) {
			player.awakenSkill("wba_shizong");
			await player.loseMaxHp();
			player.removeSkills(["wba_cunliang", "wba_bushi"]);
			await player.addSkills(["wba_fakeyou", "wba_nibaba"]);
		},
	},
};

export const translate = {
	// 武将
	wba_sp_hezhizhao: "sp何智昭",
	wba_sp_xujiashu: "sp徐家澍",
	wba_sp_songyijian: "sp宋轶健",
	wba_sp_huangyanrui: "sp黄彦瑞",

	// sp何智昭
	wba_nongfu: "农夫与蛇",
	wba_nongfu_info: "结束阶段，你可以指定一名其他角色为“蛇”。到你的下回合开始前，该角色每使用一张牌指定你为目标时，你可以摸一张牌。",
	wba_nongfu_effect: "农夫与蛇",
	wba_lvdongbin: "吕洞宾与狗",
	wba_lvdongbin_info: "准备阶段，你可以指定一名其他角色为“狗”，本回合内其每打出一张牌响应你指定其为目标的牌，你摸一张牌。",
	wba_lvdongbin_effect: "吕洞宾与狗",
	wba_gouwanglei: "我与够汪磊",
	wba_gouwanglei_info: "锁定技，当你死亡时，杀死你的角色成为“够汪磊”并失去所有非锁定技能直到游戏结束。",
	wba_gouwanglei_mark: "够汪磊",

	// sp徐家澍
	wba_bolan: "博览",
	wba_bolan_info: "摸牌阶段，你改为展示牌堆顶的四张牌，并获得其中任意张点数之和小于等于13的牌。",
	wba_zifen: "自焚",
	wba_zifen_info: "限定技，出牌阶段，你可以失去一点体力，令所有其他角色依次（按座次）选择一项：1.弃置至少X张牌（若上一名进行选择的角色以此法弃置过牌，则X为其以此法弃置的牌数+1，否则X为1）；2.受到你造成的2点火焰伤害。",

	// sp宋轶健
	wba_tuili: "推理",
	wba_tuili_info: "出牌阶段限一次，你可以与一名其他角色拼点。若你赢，则该角色本回合所有非锁定技失效，你计算至其的距离视为1，且本回合内若你对其使用的【杀】被【闪】抵消，你可以弃置其一张手牌。",
	wba_tuili_disable: "推理",
	wba_tuili_distance: "推理",
	wba_tuili_sha: "推理",
	wba_mingduan: "明断",
	wba_mingduan_info: "你可以将一张黑色牌当作【无懈可击】使用。",

	// sp黄彦瑞
	wba_cunliang: "存粮",
	wba_cunliang_info: "摸牌阶段，若你的武将牌上没有“粮”，你可以额外摸两张牌，并可以将任意数量的手牌置于武将牌上，称为“粮”；其他角色的【兵粮寸断】不能指定你为目标（“蔡晶君”除外）。",
	wba_bushi: "布施",
	wba_bushi_info: "一名角色的结束阶段，若该角色的手牌数小于其体力值且你有“粮”，你可以移去一张“粮”，令该角色摸两张牌。",
	wba_shizong: "失踪",
	wba_shizong_info: "觉醒技，准备阶段，若你的体力值为1且武将牌上没有“粮”，你减1点体力上限，失去“存粮”和“布施”，然后获得两个新技能。",
};
