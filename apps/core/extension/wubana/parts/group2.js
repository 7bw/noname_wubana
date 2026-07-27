import { lib, game, ui, get, ai, _status } from "noname";

// =============================================================
// 五班阿 扩展 —— group2
// 8 名武将（含两个乐队、两个足球队、2 个 sp、七只猪、界刘阳河）
// 共享技能：wba_canyan（参演，两将共用）、wba_changqu（长驱，两将共用）
// 两个共享技能在本文件中各定义一次。
// =============================================================

export const character = {
	// 1. 李博为·管乐队
	wba_libowei_band: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_canyan", "wba_zouyue"],
	},
	// 2. 杜时宇·管乐队
	wba_dushiyu_band: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_canyan", "wba_jigu"],
	},
	// 3. 陈嘉豪·足球队
	wba_chenjiahao_soccer: {
		sex: "male",
		group: "xue",
		hp: 5,
		skills: ["wba_changqu", "wba_angyang"],
	},
	// 4. 徐施舟·足球队
	wba_xushizhou_soccer: {
		sex: "male",
		group: "xue",
		hp: 5,
		skills: ["wba_changqu", "wba_benxi"],
	},
	// 5. sp陈翼
	wba_sp_chenyi: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_xiaocao", "wba_xidu_sp"],
	},
	// 6. 七只猪
	wba_qizhizhu: {
		sex: "male",
		group: "xue",
		hp: 7,
		skills: ["wba_beia", "wba_ritian"],
	},
	// 7. sp许盛杰
	wba_sp_xushengjie: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_rumian", "wba_qingxing"],
	},
	// 8. 刘阳河·界限突破
	wba_liuyanghe_jx: {
		sex: "male",
		group: "xue",
		hp: 4,
		skills: ["wba_sheying"],
	},
};

export const skill = {
	// =========================================================
	// 参演（共享）：锁定技，其他角色到你的距离+1。
	// globalTo 以拥有者为 to 结算：其他角色 -> 你 的距离 +1。
	// =========================================================
	wba_canyan: {
		locked: true,
		mod: {
			globalTo(from, to, distance) {
				if (from != to) {
					return distance + 1;
				}
			},
		},
	},

	// =========================================================
	// 奏乐：结束阶段，若你本回合“出牌点数”严格递增可摸两张牌；
	//       严格递减则可视为再次使用一张本回合你打出/使用过的牌。
	// 记录：group 激活的 record 子技能在使用/打出时累积点数与牌名，
	//       clear 子技能于回合开始时清空。
	// =========================================================
	wba_zouyue: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			const nums = player.getStorage("wba_zouyue_nums");
			if (nums.length < 2) {
				return false;
			}
			const inc = nums.every((n, i) => i == 0 || n > nums[i - 1]);
			const dec = nums.every((n, i) => i == 0 || n < nums[i - 1]);
			return inc || dec;
		},
		async cost(event, trigger, player) {
			const nums = player.getStorage("wba_zouyue_nums");
			const inc = nums.every((n, i) => i == 0 || n > nums[i - 1]);
			const prompt = inc ? "奏乐：是否摸两张牌？" : "奏乐：是否视为再次使用一张本回合你打出过的牌？";
			event.result = await player.chooseBool(prompt).forResult();
		},
		async content(event, trigger, player) {
			const nums = player.getStorage("wba_zouyue_nums");
			const inc = nums.every((n, i) => i == 0 || n > nums[i - 1]);
			if (inc) {
				await player.draw(2);
				return;
			}
			// 严格递减：视为再次使用一张本回合打出/使用过的牌
			const used = player.getStorage("wba_zouyue_used");
			const names = used
				.filter((name, i) => used.indexOf(name) == i)
				.filter(name => {
					const card = get.autoViewAs({ name: name, isCard: true });
					return player.hasUseTarget(card, false);
				});
			if (!names.length) {
				return;
			}
			let name = names[0];
			if (names.length > 1) {
				const result = await player
					.chooseButton(["奏乐：视为再次使用一张本回合打出过的牌", [names.map(n => [get.type(n), "", n]), "vcard"]], true)
					.set("ai", button => {
						const card = get.autoViewAs({ name: button.link[2], isCard: true });
						return get.player().getUseValue(card) || 0.1;
					})
					.forResult();
				if (!result.bool || !result.links || !result.links.length) {
					return;
				}
				name = result.links[0][2];
			}
			await player.chooseUseTarget(get.autoViewAs({ name: name, isCard: true }), false);
		},
		group: ["wba_zouyue_record", "wba_zouyue_clear"],
		subSkill: {
			record: {
				trigger: { player: ["useCard1", "respond"] },
				forced: true,
				popup: false,
				filter(event, player) {
					return player == _status.currentPhase && typeof get.number(event.card) == "number";
				},
				async content(event, trigger, player) {
					const nums = player.getStorage("wba_zouyue_nums").slice();
					nums.push(get.number(trigger.card));
					player.setStorage("wba_zouyue_nums", nums);
					const used = player.getStorage("wba_zouyue_used").slice();
					used.push(get.name(trigger.card));
					player.setStorage("wba_zouyue_used", used);
				},
			},
			clear: {
				trigger: { player: "phaseBegin" },
				forced: true,
				popup: false,
				charlotte: true,
				filter(event, player) {
					return player.getStorage("wba_zouyue_nums").length > 0 || player.getStorage("wba_zouyue_used").length > 0;
				},
				async content(event, trigger, player) {
					player.setStorage("wba_zouyue_nums", []);
					player.setStorage("wba_zouyue_used", []);
				},
			},
		},
	},

	// =========================================================
	// 击鼓：出牌阶段，你每使用/打出一张与你上一张牌类型不同的牌时，摸一张牌。
	// 用 storage.wba_jigu 记录 {phaseUse, type}，以出牌阶段为界自动重置。
	// popup:false 使其无发动动画，仅在真正摸牌时记录日志。
	// =========================================================
	wba_jigu: {
		trigger: { player: ["useCard", "respond"] },
		forced: true,
		popup: false,
		filter(event, player) {
			if (player != _status.currentPhase || !player.isPhaseUsing()) {
				return false;
			}
			return get.type(event.card) != null;
		},
		async content(event, trigger, player) {
			const phaseUse = trigger.getParent("phaseUse");
			const stored = player.storage.wba_jigu;
			let last = null;
			if (stored && stored.phaseUse == phaseUse) {
				last = stored.type;
			}
			const cur = get.type(trigger.card);
			player.storage.wba_jigu = { phaseUse: phaseUse, type: cur };
			if (last != null && cur != last) {
				player.logSkill("wba_jigu");
				await player.draw();
			}
		},
	},

	// =========================================================
	// 长驱（共享）：锁定技，你到其他角色的距离-1。
	// globalFrom 以拥有者为 from 结算：你 -> 其他角色 的距离 -1。
	// =========================================================
	wba_changqu: {
		locked: true,
		mod: {
			globalFrom(from, to, distance) {
				if (from != to) {
					return distance - 1;
				}
			},
		},
	},

	// =========================================================
	// 昂扬：当你成为红色【杀】或【决斗】的目标时，摸一张牌；
	//       若你因此受到伤害，你可以弃置伤害来源的一张牌。
	// target 作用域监听 useCardToTargeted（你为目标），player 作用域监听 damageEnd。
	// =========================================================
	wba_angyang: {
		trigger: { target: "useCardToTargeted", player: "damageEnd" },
		filter(event, player) {
			const card = event.card;
			const isRed = card && (card.name == "sha" || card.name == "juedou") && get.color(card) == "red";
			if (!isRed) {
				return false;
			}
			if (event.name == "useCardToTargeted") {
				return event.player != player;
			}
			// damageEnd：你（player）因“成为红杀/红决斗的目标”而受到伤害，来源为使用者
			// 需确认你确为该牌使用的目标（例如你自己使用【决斗】落败受伤时，你并非目标，不应触发）
			if (!event.getParent("useCard")?.targets?.includes(player)) {
				return false;
			}
			return event.source && event.source != player && event.source.isIn() && event.source.countCards("he") > 0;
		},
		async cost(event, trigger, player) {
			if (trigger.name == "useCardToTargeted") {
				// 摸牌部分为锁定，自动执行
				event.result = { bool: true };
			} else {
				// damage 事件（damageEnd 时机）：可弃置伤害来源一张牌
				event.result = await player
					.chooseBool(get.prompt("wba_angyang"), "弃置" + get.translation(trigger.source) + "的一张牌")
					.set("ai", () => get.attitude(get.player(), get.event().sourcex) < 0)
					.set("sourcex", trigger.source)
					.forResult();
			}
		},
		async content(event, trigger, player) {
			if (trigger.name == "useCardToTargeted") {
				await player.draw();
			} else {
				player.line(trigger.source);
				await player.discardPlayerCard(trigger.source, "he", true);
			}
		},
	},

	// =========================================================
	// 奔袭：其他角色回合内，若你成为过其【杀】或【决斗】的目标，
	//       则该角色结束阶段，你可以将一张黑色牌当作【杀】或【决斗】对其使用。
	// 用回合角色的 useCard 历史判断本回合你是否被其杀/决斗指定过。
	// =========================================================
	wba_benxi: {
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			const turn = event.player;
			if (turn == player || !turn.isIn()) {
				return false;
			}
			if (!player.hasCard(card => get.color(card) == "black", "he")) {
				return false;
			}
			return turn.hasHistory("useCard", evt => {
				return evt.card && (evt.card.name == "sha" || evt.card.name == "juedou") && evt.targets && evt.targets.includes(player);
			});
		},
		async cost(event, trigger, player) {
			const turn = trigger.player;
			const control = await player
				.chooseControl("sha", "juedou", "cancel2")
				.set("prompt", "奔袭：将一张黑色牌当作【杀】或【决斗】对" + get.translation(turn) + "使用")
				.set("choiceList", ["视为使用【杀】", "视为使用【决斗】"])
				.set("ai", () => {
					const p = get.player();
					const t = get.event().turnx;
					return get.effect(t, { name: "sha", isCard: true }, p, p) >= get.effect(t, { name: "juedou", isCard: true }, p, p) ? "sha" : "juedou";
				})
				.set("turnx", turn)
				.forResult();
			if (!control.control || control.control == "cancel2") {
				event.result = { bool: false };
				return;
			}
			const name = control.control;
			const cardResult = await player
				.chooseCard({
					position: "he",
					forced: true,
					filterCard: card => get.color(card) == "black",
					prompt: "奔袭：选择一张黑色牌当作【" + get.translation(name) + "】使用",
					ai: card => 6 - get.value(card),
				})
				.forResult();
			if (!cardResult.bool || !cardResult.cards.length) {
				event.result = { bool: false };
				return;
			}
			event.result = { bool: true, cards: cardResult.cards, cost_data: { name: name } };
		},
		logTarget: "player",
		async content(event, trigger, player) {
			await player.useCard({ name: event.cost_data.name, isCard: true }, trigger.player, event.cards);
		},
	},

	// =========================================================
	// 校草：锁定技，摸牌阶段额外摸一张牌，且手牌上限恒定为体力上限。
	// mod.maxHandcard 恒定返回 maxHp；phaseDrawBegin2 令 num+1。
	// =========================================================
	wba_xiaocao: {
		locked: true,
		mod: {
			maxHandcard(player, num) {
				return player.maxHp;
			},
		},
		trigger: { player: "phaseDrawBegin2" },
		forced: true,
		filter(event, player) {
			return !event.numFixed;
		},
		async content(event, trigger, player) {
			trigger.num++;
		},
	},

	// =========================================================
	// 吸毒：准备阶段，你可以弃置两张颜色不同的牌并选择一项：
	//   1.本回合出牌阶段你可以多使用两张【杀】；
	//   2.将场上一名角色装备区的一张牌移动到另一名角色；
	//   3.获得其他一名角色的一张手牌。
	// =========================================================
	wba_xidu_sp: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.hasCard(card => get.color(card) == "red", "he") && player.hasCard(card => get.color(card) == "black", "he");
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard({
					prompt: get.prompt("wba_xidu_sp"),
					prompt2: "弃置两张颜色不同的牌，然后选择一项",
					position: "he",
					selectCard: 2,
					complexCard: true,
					filterCard(card, player) {
						const selected = ui.selected.cards;
						if (!selected.length) {
							return true;
						}
						return get.color(card, player) != get.color(selected[0], player);
					},
					chooseonly: true,
					ai(card) {
						return 6 - get.value(card);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			await player.discard(event.cards);
			const control = await player
				.chooseControl("选项一", "选项二", "选项三")
				.set("prompt", "吸毒：请选择一项")
				.set("choiceList", ["本回合出牌阶段可以多使用两张【杀】", "将场上一名角色装备区的一张牌移动给另一名角色", "获得其他一名角色的一张手牌"])
				.set("ai", () => {
					const p = get.player();
					if (game.hasPlayer(t => t != p && t.countCards("h") > 0 && get.attitude(p, t) < 0)) {
						return "选项三";
					}
					return "选项一";
				})
				.forResult();
			if (control.control == "选项一") {
				// 本回合多出两张杀
				player.addTempSkill("wba_xidu_sp_sha", "phaseUseAfter");
			} else if (control.control == "选项二") {
				// 转移一张装备牌
				const t1 = await player
					.chooseTarget("吸毒：选择一名装备区有牌的角色", (card, player, target) => target.countCards("e") > 0)
					.set("ai", target => (get.attitude(get.player(), target) < 0 ? 1 : 0.1))
					.forResult();
				if (t1.bool && t1.targets.length) {
					const from = t1.targets[0];
					const cardResult = await player.choosePlayerCard(from, "e", true, "选择要移动的一张装备牌").forResult();
					if (cardResult.bool && cardResult.cards.length) {
						const movedCard = cardResult.cards[0];
						const t2 = await player
							.chooseTarget("将该装备牌移动给另一名角色", (card, player, target) => target != get.event().fromx)
							.set("fromx", from)
							.set("ai", target => 1)
							.forResult();
						if (t2.bool && t2.targets.length) {
							const to = t2.targets[0];
							player.line2([from, to]);
							await to.equip(movedCard);
						}
					}
				}
			} else if (control.control == "选项三") {
				// 获得其他一名角色的一张手牌
				const result = await player
					.chooseTarget("获得其他一名角色的一张手牌", (card, player, target) => target != player && target.countCards("h") > 0)
					.set("ai", target => -get.attitude(get.player(), target))
					.forResult();
				if (result.bool && result.targets.length) {
					const target = result.targets[0];
					player.line(target);
					await player.gainPlayerCard(target, "h", true);
				}
			}
		},
		subSkill: {
			sha: {
				charlotte: true,
				onremove: true,
				mark: true,
				marktext: "毒",
				intro: { content: "本回合出牌阶段可以多使用两张【杀】" },
				mod: {
					cardUsable(card, player, num) {
						if (card.name == "sha") {
							return num + 2;
						}
					},
				},
			},
		},
	},

	// =========================================================
	// 被阿：准备阶段，你可以将至多两名其他角色的各一张牌置于武将牌上，称为“阿”；
	//   当你身上有不少于两张“阿”时，其他角色于其出牌阶段可以移去两张“阿”，
	//   视为对你使用一张【杀】（有距离限制且计入出牌阶段使用次数）。
	// grant 子技能在其他角色回合开始时临时授予其 wba_beia_use（视为杀）；
	// useEffect 子技能在该杀使用时替拥有者移去两张“阿”。
	// =========================================================
	wba_beia: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(target => target != player && target.countCards("he") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget({
					prompt: get.prompt("wba_beia"),
					prompt2: "将至多两名其他角色的各一张牌置于你的武将牌上，称为「阿」",
					selectTarget: [1, 2],
					filterTarget(card, player, target) {
						return target != player && target.countCards("he") > 0;
					},
					ai(target) {
						return 1 - get.attitude(get.player(), target);
					},
				})
				.forResult();
		},
		async content(event, trigger, player) {
			for (const target of event.targets) {
				if (!target.isIn() || !target.countCards("he")) {
					continue;
				}
				const result = await player.choosePlayerCard(target, "he", true, "选择" + get.translation(target) + "的一张牌置为「阿」").forResult();
				if (result.bool && result.cards.length) {
					const next = player.addToExpansion(result.cards, target, "give");
					next.gaintag.add("wba_beia");
					await next;
				}
			}
		},
		marktext: "阿",
		intro: {
			content: "expansion",
			markcount: "expansion",
		},
		onremove(player, skill) {
			const cards = player.getExpansions("wba_beia");
			if (cards.length) {
				player.loseToDiscardpile(cards);
			}
		},
		group: ["wba_beia_grant", "wba_beia_useEffect"],
		subSkill: {
			// 在其他角色回合开始时，若拥有者有≥2张“阿”，临时授予其“视为使用杀”的能力
			grant: {
				trigger: { global: "phaseBegin" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.player != player && player.getExpansions("wba_beia").length >= 2;
				},
				async content(event, trigger, player) {
					trigger.player.addTempSkill("wba_beia_use", "phaseAfter");
				},
			},
			// 视为使用杀技能（授予给其他角色）
			use: {
				enable: "phaseUse",
				viewAs: { name: "sha", isCard: true },
				selectCard: 0,
				filterCard: () => false,
				charlotte: true,
				viewAsFilter(player) {
					return game.hasPlayer(owner => owner != player && owner.hasSkill("wba_beia") && owner.getExpansions("wba_beia").length >= 2);
				},
				filterTarget(card, player, target) {
					if (!target.hasSkill("wba_beia") || target.getExpansions("wba_beia").length < 2) {
						return false;
					}
					return lib.filter.filterTarget.apply(this, arguments);
				},
				prompt: "移去一名角色的两张「阿」，视为对其使用一张【杀】",
				ai: {
					order: 2,
					result: {
						target(player, target) {
							return get.effect(target, { name: "sha", isCard: true }, player, player);
						},
					},
				},
			},
			// 当“视为杀”被使用时，替被指定的拥有者移去两张“阿”
			useEffect: {
				trigger: { global: "useCard" },
				forced: true,
				popup: false,
				filter(event, player) {
					return event.skill == "wba_beia_use" && event.targets && event.targets.includes(player) && player.getExpansions("wba_beia").length >= 2;
				},
				async content(event, trigger, player) {
					const list = player.getExpansions("wba_beia").slice(0, 2);
					if (list.length) {
						game.log(list, "作为「阿」被移去");
						await player.loseToDiscardpile(list);
					}
				},
			},
		},
	},

	// =========================================================
	// 日天：锁定技，若你的体力值为全场唯一最多，则你对其他角色使用【杀】时
	//       须弃置一张基本牌，否则此【杀】无效。
	// =========================================================
	wba_ritian: {
		trigger: { player: "useCard1" },
		forced: true,
		locked: true,
		filter(event, player) {
			if (!event.card || event.card.name != "sha") {
				return false;
			}
			if (!event.targets || !event.targets.some(t => t != player)) {
				return false;
			}
			return !game.hasPlayer(other => other != player && other.hp >= player.hp);
		},
		async content(event, trigger, player) {
			let discarded = false;
			if (player.hasCard(card => get.type(card) == "basic", "he")) {
				const result = await player
					.chooseToDiscard("he", 1, "日天：弃置一张基本牌，否则此【杀】无效", card => get.type(card) == "basic")
					.set("ai", card => 6 - get.value(card))
					.forResult();
				discarded = !!(result && result.bool);
			}
			if (!discarded) {
				// 未弃置基本牌（无牌可弃或放弃）—— 此杀无效
				trigger.targets.length = 0;
				trigger.all_excluded = true;
				game.log(trigger.card, "被", "#g日天", "无效了");
			}
		},
	},

	// =========================================================
	// 入眠：当你即将受到伤害时，你可以摸一张牌并将武将牌翻面，防止此次伤害。
	// =========================================================
	wba_rumian: {
		trigger: { player: "damageBegin4" },
		filter(event, player) {
			return event.num > 0;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("wba_rumian"), "摸一张牌并将武将牌翻面，防止此次伤害")
				.set("ai", () => {
					// 伤害较大或濒死时倾向发动
					return get.event().dmgnum >= 1;
				})
				.set("dmgnum", trigger.num)
				.forResult();
		},
		async content(event, trigger, player) {
			await player.draw();
			player.turnOver();
			trigger.cancel();
		},
	},

	// =========================================================
	// 清醒：当你将武将牌从背面翻回正面时，你可以选择一项：
	//   1.回复一点体力；2.摸两张牌。
	// =========================================================
	wba_qingxing: {
		trigger: { player: "turnOverAfter" },
		filter(event, player) {
			return !player.isTurnedOver();
		},
		async cost(event, trigger, player) {
			const result = await player
				.chooseControl("恢复体力", "摸两张牌", "cancel2")
				.set("prompt", get.prompt("wba_qingxing"))
				.set("choiceList", ["回复一点体力", "摸两张牌"])
				.set("ai", () => {
					const p = get.player();
					return p.isDamaged() ? "恢复体力" : "摸两张牌";
				})
				.forResult();
			event.result = { bool: result.control != "cancel2", cost_data: result.control };
		},
		async content(event, trigger, player) {
			if (event.cost_data == "恢复体力") {
				await player.recover();
			} else {
				await player.draw(2);
			}
		},
	},

	// =========================================================
	// 摄影：每当其他一名角色造成伤害后，你可以选择其一项技能（非锁定技/限定技/
	//   觉醒技）并获得其一次性使用权；在你使用该技能或对该角色造成伤害之前，
	//   该角色无法使用该技能。
	// 说明：完整“一次性使用”较复杂，此处实现为——
	//   · 获得该技能的副本（addSkills）；
	//   · 令来源角色的该技能失效（disableSkill）；
	//   · 当你使用该技能后（useSkillAfter）或你对该角色造成伤害后（damageSource），
	//     归还该技能（enableSkill + removeSkill）。
	// =========================================================
	wba_sheying: {
		trigger: { global: "damageSource" },
		filter(event, player) {
			const source = event.source;
			if (!source || source == player || !source.isIn()) {
				return false;
			}
			return (
				source.getGainableSkills((info, skill) => {
					return info && !get.is.locked(skill, source) && !info.limited && !info.juexingji && !info.zhuSkill && skill != "wba_sheying";
				}).length > 0
			);
		},
		async cost(event, trigger, player) {
			const source = trigger.source;
			const result = await player
				.chooseSkill(source, {
					prompt: get.prompt("wba_sheying", source),
					func: (info, skill) => info && !get.is.locked(skill, source) && !info.limited && !info.juexingji && !info.zhuSkill && skill != "wba_sheying",
				})
				.forResult();
			event.result = { bool: !!(result && result.bool && result.skill), cost_data: result ? result.skill : null, targets: [source] };
		},
		logTarget: "source",
		async content(event, trigger, player) {
			const source = trigger.source;
			const skill = event.cost_data;
			if (!skill) {
				return;
			}
			const storage = player.getStorage("wba_sheying").slice();
			const had = player.hasSkill(skill);
			// 获得该技能的一次性使用权
			if (!had) {
				await player.addSkills(skill);
			}
			// 令来源角色的该技能失效，直到你使用该技能或对其造成伤害（每个技能一个独立的失效原因）
			source.disableSkill("wba_sheying_" + player.playerid + "_" + skill, skill);
			storage.push({ source: source, skill: skill, added: !had });
			player.setStorage("wba_sheying", storage);
		},
		group: ["wba_sheying_return"],
		subSkill: {
			return: {
				// 归还时机：你使用了借来的技能 / 你对来源造成伤害 / 你或来源死亡
				trigger: { source: "damageSource", player: ["useSkillAfter", "logSkill"], global: "dieAfter" },
				forced: true,
				forceDie: true,
				popup: false,
				filter(event, player) {
					const storage = player.getStorage("wba_sheying");
					if (!storage.length) {
						return false;
					}
					// die 事件：你死亡 -> 全部归还；某来源死亡 -> 归还其对应技能
					if (event.name == "die") {
						return event.player == player || storage.some(info => info.source == event.player);
					}
					// damage 事件（damageSource 时机）：你对借来技能的原主造成伤害
					if (event.name == "damage") {
						return storage.some(info => info.source == event.player);
					}
					// useSkill/logSkill 事件：你使用了借来的技能（logSkill 覆盖被动触发技，useSkillAfter 覆盖主动技，二者都不可少）
					return storage.some(info => info.skill == event.skill);
				},
				async content(event, trigger, player) {
					let storage = player.getStorage("wba_sheying").slice();
					let toReturn;
					if (trigger.name == "die") {
						// 你自己死亡：全部归还；某来源死亡：仅归还其对应技能
						toReturn = trigger.player == player ? storage.slice() : storage.filter(info => info.source == trigger.player);
					} else if (trigger.name == "damage") {
						toReturn = storage.filter(info => info.source == trigger.player);
					} else {
						toReturn = storage.filter(info => info.skill == trigger.skill);
					}
					for (const info of toReturn) {
						if (info.source && info.source.isIn()) {
							info.source.enableSkill("wba_sheying_" + player.playerid + "_" + info.skill);
						}
						if (info.added && player.hasSkill(info.skill)) {
							player.removeSkill(info.skill);
						}
					}
					storage = storage.filter(info => !toReturn.includes(info));
					player.setStorage("wba_sheying", storage);
				},
			},
		},
	},
};

export const translate = {
	// —— 武将名 ——
	wba_libowei_band: "李博为·管乐队",
	wba_dushiyu_band: "杜时宇·管乐队",
	wba_chenjiahao_soccer: "陈嘉豪·足球队",
	wba_xushizhou_soccer: "徐施舟·足球队",
	wba_sp_chenyi: "sp陈翼",
	wba_qizhizhu: "七只猪",
	wba_sp_xushengjie: "sp许盛杰",
	wba_liuyanghe_jx: "刘阳河·界限突破",

	// —— 技能名 + 描述 ——
	wba_canyan: "参演",
	wba_canyan_info: "锁定技，其他角色到你的距离+1。",

	wba_zouyue: "奏乐",
	wba_zouyue_info: "结束阶段，若你本回合使用或打出的牌的点数严格递增，你可以摸两张牌；若严格递减，你可以视为再次使用一张本回合你使用或打出过的牌。",

	wba_jigu: "击鼓",
	wba_jigu_info: "出牌阶段，你每使用或打出一张与你上一张牌类型不同的牌时，你摸一张牌。",

	wba_changqu: "长驱",
	wba_changqu_info: "锁定技，你到其他角色的距离-1。",

	wba_angyang: "昂扬",
	wba_angyang_info: "当你成为红色【杀】或【决斗】的目标时，你摸一张牌；若你因此受到伤害，你可以弃置伤害来源的一张牌。",

	wba_benxi: "奔袭",
	wba_benxi_info: "其他角色的回合内，若你成为过其【杀】或【决斗】的目标，则该角色的结束阶段，你可以将一张黑色牌当作【杀】或【决斗】对其使用。",

	wba_xiaocao: "校草",
	wba_xiaocao_info: "锁定技，摸牌阶段你额外摸一张牌，且你的手牌上限恒定为你的体力上限。",

	wba_xidu_sp: "吸毒",
	wba_xidu_sp_info: "准备阶段，你可以弃置两张颜色不同的牌并选择一项：1.本回合出牌阶段你可以多使用两张【杀】；2.将场上一名角色装备区的一张牌移动给另一名角色；3.获得其他一名角色的一张手牌。",

	wba_beia: "被阿",
	wba_beia_info: "准备阶段，你可以将至多两名其他角色的各一张牌置于你的武将牌上，称为「阿」；当你有不少于两张「阿」时，其他角色于其出牌阶段可以移去两张「阿」，视为对你使用一张【杀】（有距离限制且计入出牌阶段使用次数）。",

	wba_ritian: "日天",
	wba_ritian_info: "锁定技，若你的体力值为全场唯一最多，则你对其他角色使用【杀】时须弃置一张基本牌，否则此【杀】无效。",

	wba_rumian: "入眠",
	wba_rumian_info: "当你即将受到伤害时，你可以摸一张牌并将武将牌翻面，防止此次伤害。",

	wba_qingxing: "清醒",
	wba_qingxing_info: "当你将武将牌从背面翻回正面时，你可以选择一项：1.回复一点体力；2.摸两张牌。",

	wba_sheying: "摄影",
	wba_sheying_info: "每当其他一名角色造成伤害后，你可以选择其一项技能（非锁定技、限定技、觉醒技）并获得其一次性使用权；在你使用该技能或对该角色造成伤害之前，该角色无法使用该技能。",
};
