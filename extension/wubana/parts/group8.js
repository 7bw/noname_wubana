import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 五班阿扩展 —— 第八组：工（gong）势力武将（换位置主题）
 * 工黄彦瑞、工宋轶健
 * “奶”统一使用扩展标记 wba_nai（置于某角色武将牌上）；wba_nai_mark 为其显示载体技能。
 */

export const character = {
	wba_gong_dahuang: { sex: "male", group: "gong", hp: 3, skills: ["wba_duwu", "wba_siren", "wba_chuchai"] },
	wba_gong_songyijian: { sex: "male", group: "gong", hp: 4, skills: ["wba_diaoban", "wba_baiban", "wba_yeban"] },
};

export const skill = {
	/* ============ 工黄彦瑞 ============ */
	// 睹物：受到伤害时可判定，将判定牌置于一名角色武将牌上称为“奶”，该角色体力上限+1。
	wba_duwu: {
		trigger: { player: "damageEnd" },
		filter(event, player) {
			return true;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_duwu"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			await player
				.judge()
				.set("callback", async judge => {
					const card = judge.card;
					if (!card || get.position(card, true) !== "o") {
						return;
					}
					const r = await player
						.chooseTarget("睹物：将判定牌置于一名角色的武将牌上，称为“奶”", true, (c, p, target) => true)
						.set("ai", target => (get.attitude(player, target) > 0 ? (target.sex === "female" ? 2 : 1) : -1))
						.forResult();
					if (!r.bool || !r.targets || !r.targets.length) {
						return;
					}
					const target = r.targets[0];
					player.line(target, "green");
					const next = target.addToExpansion(card, target, "give");
					next.gaintag.add("wba_nai");
					await next;
					if (!target.hasSkill("wba_nai_mark")) {
						target.addSkill("wba_nai_mark");
					}
					target.markSkill("wba_nai_mark");
					await target.gainMaxHp();
					game.log(target, "获得一张", "#g“奶”", "，体力上限+1");
				})
				.forResult();
		},
	},
	// 奶的显示载体（可被任意角色持有）
	wba_nai_mark: {
		charlotte: false,
		marktext: "奶",
		intro: {
			name: "奶",
			markcount(storage, player) {
				return player.getExpansions("wba_nai").length;
			},
			mark(dialog, storage, player) {
				const cards = player.getExpansions("wba_nai");
				if (cards.length) {
					dialog.addAuto(cards);
				} else {
					dialog.add("没有“奶”");
				}
			},
		},
		onremove(player) {
			const cards = player.getExpansions("wba_nai");
			if (cards.length) {
				player.loseToDiscardpile(cards);
				player.loseMaxHp(cards.length);
			}
		},
	},
	// 思人：出牌阶段限一次，令一名有“奶”的角色移去一张“奶”并回复体力（女性额外+上限），按“奶”类型触发不同效果。
	wba_siren: {
		enable: "phaseUse",
		usable: 1,
		filterTarget(card, player, target) {
			return target.getExpansions("wba_nai").length > 0;
		},
		async content(event, trigger, player) {
			const target = event.target;
			const naiCards = target.getExpansions("wba_nai");
			let chosen;
			if (naiCards.length === 1) {
				chosen = naiCards[0];
			} else {
				const r = await player
					.chooseButton(["思人：移去" + get.translation(target) + "的一张“奶”", naiCards], true)
					.set("ai", button => get.value(button.link))
					.forResult();
				chosen = r.links && r.links[0];
			}
			if (!chosen) {
				return;
			}
			const type = get.type2(chosen);
			await target.loseToDiscardpile([chosen]);
			await target.loseMaxHp();
			game.log(target, "移去了一张“奶”");
			if (target.sex === "female") {
				await target.gainMaxHp();
			}
			await target.recover();
			if (type === "basic") {
				target.addTempSkill("wba_siren_basic", { player: "phaseUseAfter" });
				game.log(target, "本回合出牌阶段使用的下一张基本牌伤害/回复量+1");
			} else if (type === "trick") {
				const used = player.storage.wba_siren_used || [];
				const names = (lib.inpile || []).filter(name => {
					const info = lib.card[name];
					return info && info.type === "trick" && !used.includes(name);
				});
				const usable = names.filter(name => player.hasUseTarget(get.autoViewAs({ name, isCard: true })));
				if (usable.length) {
					const vcards = usable.map(name => ["", "", name]);
					const r = await player
						.chooseButton(["思人：视为使用一张本局未通过“思人”使用过的普通锦囊牌", [vcards, "vcard"]], true)
						.set("ai", button => get.order({ name: button.link[2] }) + Math.random())
						.forResult();
					if (r.bool && r.links && r.links.length) {
						const name = r.links[0][2];
						player.storage.wba_siren_used = used.concat([name]);
						await player.chooseUseTarget(get.autoViewAs({ name, isCard: true }), true, false);
					}
				} else {
					game.log(player, "没有可使用的普通锦囊牌");
				}
			} else if (type === "equip") {
				const r = await player
					.chooseTarget("思人：选择一名其他角色，与" + get.translation(target) + "交换装备区内的所有牌", true, (c, p, t) => t !== target)
					.set("ai", t => -get.attitude(player, t))
					.forResult();
				if (r.bool && r.targets && r.targets.length) {
					const other = r.targets[0];
					player.line([target, other], "green");
					await other.swapEquip(target);
					game.log(other, "与", target, "交换了装备区内的所有牌");
				}
			}
		},
		ai: {
			order: 6,
			result: {
				target(player, target) {
					return get.attitude(player, target) >= 0 ? 1.5 : -0.5;
				},
			},
		},
	},
	wba_siren_basic: {
		charlotte: true,
		trigger: { player: "useCard1" },
		filter(event, player) {
			return get.type(event.card, null, false) === "basic" && !!event.getParent("phaseUse", true);
		},
		forced: true,
		popup: false,
		async content(event, trigger, player) {
			player.removeSkill("wba_siren_basic");
			player.addTempSkill("wba_siren_boost");
			player.markAuto("wba_siren_boost", [trigger.card]);
		},
	},
	wba_siren_boost: {
		charlotte: true,
		trigger: { source: "damageBegin1", player: "recoverBegin" },
		forced: true,
		popup: false,
		filter(event, player) {
			return event.card && (player.getStorage("wba_siren_boost") || []).includes(event.card);
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},
	// 出差：限定技，出牌阶段，若武将牌上有至少三张“奶”，可弃三张“奶”并与一名其他角色交换座次。
	wba_chuchai: {
		enable: "phaseUse",
		limited: true,
		skillAnimation: true,
		animationColor: "wood",
		filter(event, player) {
			return !player.awakenedSkills.includes("wba_chuchai") && player.getExpansions("wba_nai").length >= 3 && game.hasPlayer(cur => cur !== player);
		},
		filterTarget(card, player, target) {
			return target !== player;
		},
		async content(event, trigger, player) {
			player.awakenSkill("wba_chuchai");
			const nai = player.getExpansions("wba_nai").slice(0, 3);
			await player.loseToDiscardpile(nai);
			await player.loseMaxHp(nai.length);
			player.line(event.target, "green");
			game.swapSeat(player, event.target);
			game.log(player, "与", event.target, "交换了座次");
		},
		ai: {
			order: 1,
			result: {
				target(player, target) {
					return -get.attitude(player, target);
				},
			},
		},
	},

	/* ============ 工宋轶健 ============ */
	// 调班：准备阶段可与一名角色拼点，赢→回血+势力转“阳”，输→掉血+势力转“阴”；红牌点数+X，黑牌-X（X为体力值）。
	wba_diaoban: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(cur => player.canCompare(cur));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_diaoban"), (card, p, target) => p.canCompare(target))
				.set("ai", target => (get.attitude(player, target) < 0 ? 1.5 : 1))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.addTempSkill("wba_diaoban_num");
			const result = await player.chooseToCompare(target).forResult();
			player.removeSkill("wba_diaoban_num");
			if (result.bool) {
				if (player.isDamaged()) {
					await player.recover();
				}
				await player.changeGroup("yang");
			} else if (!result.tie) {
				await player.loseHp();
				await player.changeGroup("yin");
			}
		},
	},
	wba_diaoban_num: {
		charlotte: true,
		trigger: { player: "compare", target: "compare" },
		forced: true,
		silent: true,
		popup: false,
		filter(event, player) {
			const mine = event.player === player ? event.card1 : event.card2;
			return mine && get.color(mine, player) !== "none";
		},
		async content(event, trigger, player) {
			const mine = trigger.player === player ? trigger.card1 : trigger.card2;
			const x = player.getHp();
			const delta = get.color(mine, player) === "red" ? x : -x;
			if (trigger.player === player) {
				trigger.num1 = Math.max(1, trigger.num1 + delta);
			} else {
				trigger.num2 = Math.max(1, trigger.num2 + delta);
			}
			game.log(player, "“调班”使拼点点数", delta >= 0 ? "增加" : "减少", "#y" + Math.abs(delta));
		},
	},
	// 白班：阳势力技，成为【杀】或【决斗】目标时，可弃一张红牌，将目标转移给攻击范围内一名其他角色（非使用者）。
	wba_baiban: {
		groupSkill: "yang",
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (player.group !== "yang") {
				return false;
			}
			if (!event.card || !["sha", "juedou"].includes(event.card.name)) {
				return false;
			}
			if (event.target !== player) {
				return false;
			}
			if (!player.hasCard(c => get.color(c, player) === "red", "he")) {
				return false;
			}
			return game.hasPlayer(cur => cur !== player && cur !== event.player && player.inRange(cur));
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseCardTarget({
					prompt: "白班：弃置一张红色牌，将【" + get.translation(trigger.card.name) + "】的目标转移给你攻击范围内的一名其他角色",
					filterCard: (card, p) => get.color(card, p) === "red",
					position: "he",
					filterTarget: (card, p, target) => target !== p && target !== trigger.player && p.inRange(target),
					ai1: card => 6 - get.value(card),
					ai2: target => get.effect(target, trigger.card, trigger.player, player),
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			const newTarget = event.targets[0];
			player.line(newTarget, "fire");
			const parent = trigger.getParent();
			if (parent && Array.isArray(parent.targets)) {
				parent.targets.remove(player);
				parent.targets.add(newTarget);
			}
			if (Array.isArray(trigger.targets)) {
				trigger.targets.remove(player);
			}
			game.log(trigger.card, "的目标从", player, "转移给", newTarget);
		},
	},
	// 夜班：阴势力技，若本回合出牌阶段使用的牌不少于两张且均为黑色，则此回合结束后进行一个额外的回合。
	wba_yeban: {
		groupSkill: "yin",
		trigger: { player: "phaseAfter" },
		filter(event, player) {
			if (player.group !== "yin") {
				return false;
			}
			const uses = player.getHistory("useCard", evt => !!evt.getParent("phaseUse", true));
			if (uses.length < 2) {
				return false;
			}
			return uses.every(evt => get.color(evt.card, player) === "black");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_yeban"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			game.log(player, "发动“夜班”，进行一个额外的回合");
			player.insertPhase();
		},
	},
};

export const translate = {
	/* 武将名 */
	wba_gong_dahuang: "工黄彦瑞",
	wba_gong_songyijian: "工宋轶健",

	/* 工黄彦瑞 */
	wba_duwu: "睹物",
	wba_duwu_info: "当你受到伤害时，你可以进行一次判定，并将判定牌置于一名角色的武将牌上，称为“奶”。该角色的体力上限根据其武将牌上“奶”的数量而增减：每有一张“奶”，体力上限+1；若“奶”被移除，体力上限相应减少。",
	wba_nai_mark: "奶",
	wba_nai_mark_info: "你的武将牌上有“奶”牌。",
	wba_siren: "思人",
	wba_siren_info: "出牌阶段限一次，你可以指定一名武将牌上有“奶”的角色，令其移去一张“奶”并回复一点体力（若该角色为女性角色则额外增加一点体力上限）。若该“奶”为基本牌：该角色出牌阶段使用的下一张基本牌造成的伤害量或回复量+1；若为锦囊牌：你视为使用一张本局游戏尚未通过“思人”使用过的普通锦囊牌；若为装备牌：你选择一名其他角色与该角色交换装备区内的所有牌。",
	wba_siren_basic: "思人",
	wba_siren_boost: "思人",
	wba_chuchai: "出差",
	wba_chuchai_info: "限定技，出牌阶段，若你武将牌上有至少三张“奶”，你可以弃掉三张“奶”并将自己与一名其他角色交换座次。",

	/* 工宋轶健 */
	wba_diaoban: "调班",
	wba_diaoban_info: "准备阶段，你可以指定一名角色与其拼点。若你赢，你回复一点体力并将自身势力转换为“阳”；若你输，你失去一点体力并将自身势力转换为“阴”。此次拼点若你使用红色手牌则点数增加X，若使用黑色手牌则点数减少X（X为你当前体力值）。",
	wba_diaoban_num: "调班",
	wba_baiban: "白班",
	wba_baiban_info: "阳势力技，当你成为【杀】或【决斗】的目标时，你可以弃置一张红色牌并选择你攻击范围内的一名其他角色（不能是【杀】或【决斗】的使用者），然后将此【杀】或【决斗】的目标转移给该角色。",
	wba_yeban: "夜班",
	wba_yeban_info: "阴势力技，若你本回合于出牌阶段使用的牌不少于两张且均为黑色，则你可以于此回合结束后进行一个额外的回合。",
};
