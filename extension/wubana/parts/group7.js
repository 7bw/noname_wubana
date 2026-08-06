import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 五班阿扩展 —— 第七组：研（yan）势力武将
 * 研杜时宇、研徐家澍、研李博为
 * “阅历”牌统一使用扩展标记 wba_yueli（正面朝上置于武将牌上）
 */

export const character = {
	wba_yan_dushiyu: { sex: "male", group: "yan", hp: 4, skills: ["wba_shiyan", "wba_baichuan"] },
	wba_yan_xujiashu: { sex: "male", group: "yan", hp: 4, skills: ["wba_xiaobenshengyi", "wba_fbi"], img: "extension/wubana/yan_xujiashu.jpg" },
	wba_yan_libowei: { sex: "male", group: "yan", hp: 4, skills: ["wba_kuhan", "wba_zibi"] },
};

export const skill = {
	/* ============ 研杜时宇 ============ */
	// 实验：出牌阶段限一次，从牌堆底亮出一张牌并判定，同色→判定牌成为“阅历”；异色→失去1点体力并获得两张牌。
	//        每有一张“阅历”牌手牌上限+1。
	wba_shiyan: {
		enable: "phaseUse",
		usable: 1,
		filter(event, player) {
			return true;
		},
		async content(event, trigger, player) {
			const revealed = get.bottomCards(1, false)[0];
			game.cardsGotoOrdering([revealed]);
			await player.showCards([revealed], get.translation(player) + "发动【实验】亮出的牌");
			const revealColor = get.color(revealed);
			await player
				.judge()
				.set("callback", async judge => {
					const jcard = judge.card;
					const jcolor = judge.judgeResult ? judge.judgeResult.color : get.color(jcard);
					if (revealColor !== "none" && jcolor !== "none" && revealColor === jcolor) {
						game.log(player, "亮出的牌与判定牌颜色相同");
						if (get.position(revealed, true) === "o") {
							await game.cardsDiscard([revealed]);
						}
						if (get.position(jcard, true) === "o") {
							const next = player.addToExpansion(jcard, player, "give");
							next.gaintag.add("wba_yueli");
							await next;
							player.markSkill("wba_shiyan");
							game.log(player, "将判定牌置于武将牌上，称为", "#g“阅历”");
						}
					} else {
						game.log(player, "亮出的牌与判定牌颜色不同");
						await player.loseHp();
						const gains = [];
						if (get.position(revealed, true) === "o") {
							gains.push(revealed);
						}
						if (get.position(jcard, true) === "o") {
							gains.push(jcard);
						}
						if (gains.length) {
							await player.gain(gains, "gain2");
						}
					}
				})
				.forResult();
		},
		mod: {
			maxHandcard(player, num) {
				return num + player.getExpansions("wba_yueli").length;
			},
		},
		marktext: "阅",
		intro: {
			name: "阅历",
			content: "expansion",
			markcount: "expansion",
			mark(dialog, storage, player) {
				const cards = player.getExpansions("wba_yueli");
				if (cards.length) {
					dialog.addAuto(cards);
				} else {
					dialog.add("没有“阅历”牌");
				}
			},
		},
		ai: {
			order: 7,
			result: { player: 1 },
		},
	},
	// 百川：使命技，记录使用/被使用牌的花色，集满四种花色且“阅历”<3时清空并获得一张“阅历”。
	//        成功：“阅历”达三张，失去“百川”获得“勃朗”。失败：进入濒死或本回合弃牌≥体力值。
	wba_baichuan: {
		dutySkill: true,
		derivation: ["wba_bolang"],
		group: ["wba_baichuan_record", "wba_baichuan_zhunbei", "wba_baichuan_achieve", "wba_baichuan_fail"],
		intro: {
			markcount(storage, player) {
				return (player.storage.wba_baichuan_suits || []).length;
			},
			content(storage, player) {
				const s = player.storage.wba_baichuan_suits || [];
				return s.length ? "已记录花色：" + s.map(x => get.translation(x)).join("、") : "未记录花色";
			},
		},
		subSkill: {
			record: {
				trigger: { player: "useCard1", target: "useCardToTargeted" },
				forced: true,
				popup: false,
				firstDo: true,
				filter(event, player) {
					if (event.name === "useCardToTargeted") {
						if (event.player === player || event.target !== player) {
							return false;
						}
					}
					const suit = get.suit(event.card, event.player);
					if (!lib.suit.includes(suit)) {
						return false;
					}
					return !(player.storage.wba_baichuan_suits || []).includes(suit);
				},
				async content(event, trigger, player) {
					if (!player.storage.wba_baichuan_suits) {
						player.storage.wba_baichuan_suits = [];
					}
					const suit = get.suit(trigger.card, trigger.player);
					player.storage.wba_baichuan_suits.add(suit);
					player.markSkill("wba_baichuan");
					game.log(player, "“百川”记录了花色", "#g" + get.translation(suit));
				},
			},
			zhunbei: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				filter(event, player) {
					const s = player.storage.wba_baichuan_suits || [];
					return s.length >= 4 && player.getExpansions("wba_yueli").length < 3;
				},
				async content(event, trigger, player) {
					player.storage.wba_baichuan_suits = [];
					player.markSkill("wba_baichuan");
					const cards = get.cards(1);
					game.cardsGotoOrdering(cards);
					const next = player.addToExpansion(cards, player, "give");
					next.gaintag.add("wba_yueli");
					await next;
					player.markSkill("wba_shiyan");
					game.log(player, "“百川”集满四种花色，获得一张", "#g“阅历”");
				},
			},
			achieve: {
				trigger: { player: "addToExpansionAfter" },
				forced: true,
				locked: false,
				skillAnimation: true,
				animationColor: "thunder",
				filter(event, player) {
					return player.getExpansions("wba_yueli").length >= 3;
				},
				async content(event, trigger, player) {
					player.awakenSkill("wba_baichuan");
					game.log(player, "的使命“百川”成功");
					await player.changeSkills(["wba_bolang"], ["wba_baichuan"]);
				},
			},
			fail: {
				trigger: { player: ["dying", "phaseJieshuBegin"] },
				forced: true,
				locked: false,
				filter(event, player) {
					if (event.name === "dying") {
						return event.player === player;
					}
					const x = Math.max(1, player.getHp());
					const discarded = player.getHistory("lose").reduce((n, evt) => n + (evt.type === "discard" ? (evt.cards || []).length : 0), 0);
					return discarded >= x;
				},
				async content(event, trigger, player) {
					player.awakenSkill("wba_baichuan");
					game.log(player, "的使命“百川”失败");
					await player.removeSkills(["wba_baichuan"]);
				},
			},
		},
	},
	// 勃朗：距离锁定技+弃“阅历”观看并弃牌+以“阅历”代替判定牌。
	wba_bolang: {
		mod: {
			globalTo(from, to, distance) {
				if (from !== to) {
					return distance + 1;
				}
			},
			globalFrom(from, to, distance) {
				if (from !== to) {
					return distance - 1;
				}
			},
		},
		group: ["wba_bolang_view", "wba_bolang_judge"],
		subSkill: {
			view: {
				enable: "phaseUse",
				usable: 1,
				filter(event, player) {
					return player.getExpansions("wba_yueli").length > 0 && game.hasPlayer(cur => cur !== player && cur.countCards("h") > 0);
				},
				async content(event, trigger, player) {
					const yueli = player.getExpansions("wba_yueli");
					const r = await player
						.chooseButton(["勃朗：弃置一张“阅历”牌", yueli], true)
						.set("ai", button => 6 - get.value(button.link))
						.forResult();
					if (!r.bool || !r.links || !r.links.length) {
						return;
					}
					const chosen = r.links[0];
					const suit = get.suit(chosen, player);
					await player.loseToDiscardpile([chosen]);
					game.log(player, "弃置了一张“阅历”牌（", "#g" + get.translation(suit), "）");
					const r2 = await player
						.chooseTarget("勃朗：观看一名其他角色的手牌", true, (card, p, target) => target !== p && target.countCards("h") > 0)
						.set("ai", target => 1 - get.attitude(player, target))
						.forResult();
					if (!r2.bool || !r2.targets || !r2.targets.length) {
						return;
					}
					const target = r2.targets[0];
					player.line(target);
					await player.viewHandcards(target);
					const toDiscard = target.getCards("h", card => get.suit(card, target) === suit);
					if (toDiscard.length) {
						await target.discard(toDiscard);
						game.log(player, "弃置了", target, "花色为", "#g" + get.translation(suit), "的手牌");
					} else {
						game.log(target, "没有花色为", "#g" + get.translation(suit), "的手牌");
					}
				},
				ai: {
					order: 8,
					result: { player: 1 },
				},
			},
			judge: {
				trigger: { global: "judge" },
				filter(event, player) {
					return player.getExpansions("wba_yueli").length > 0;
				},
				async cost(event, trigger, player) {
					const yueli = player.getExpansions("wba_yueli");
					const r = await player
						.chooseButton([
							get.translation(trigger.player) + "的判定牌为" + get.translation(trigger.player.judging[0]) + "，" + get.prompt("wba_bolang_judge"),
							yueli,
						])
						.set("filterButton", () => true)
						.set("ai", button => {
							const trig = _status.event.getTrigger();
							const cur = trig.judge(trig.player.judging[0]);
							const neu = trig.judge(button.link);
							const att = get.attitude(player, trig.player);
							if (att === 0) {
								return 0;
							}
							const better = neu - cur;
							return att > 0 ? better : -better;
						})
						.forResult();
					event.result = { bool: r.bool, cost_data: r.links && r.links[0] };
				},
				async content(event, trigger, player) {
					const card = event.cost_data;
					if (!card) {
						return;
					}
					await player.lose(card, ui.ordering);
					if (trigger.player.judging[0].clone) {
						trigger.player.judging[0].clone.delete();
					}
					await game.cardsDiscard(trigger.player.judging[0]);
					trigger.player.judging[0] = card;
					trigger.orderingCards.addArray([card]);
					game.log(trigger.player, "的判定牌被", player, "用“阅历”改为", card);
					await game.delay(2);
				},
			},
		},
	},

	/* ============ 研徐家澍 ============ */
	// 小本生意：使命技，游戏开始时获得“转运”。成功：准备阶段发动“转运”次数≥总人数，升级“转运”并获得“走私”。
	//            失败：达成前进入濒死，失去“转运”。
	wba_xiaobenshengyi: {
		dutySkill: true,
		derivation: ["wba_zhuanyun", "wba_zousi"],
		group: ["wba_xiaobenshengyi_start", "wba_xiaobenshengyi_achieve", "wba_xiaobenshengyi_fail"],
		subSkill: {
			start: {
				trigger: { player: "enterGame", global: "gameStart" },
				forced: true,
				locked: false,
				filter(event, player) {
					return !player.hasSkill("wba_zhuanyun", null, null, false);
				},
				async content(event, trigger, player) {
					await player.addSkills(["wba_zhuanyun"]);
				},
			},
			achieve: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				locked: false,
				skillAnimation: true,
				animationColor: "gray",
				filter(event, player) {
					if ((player.storage.wba_zhuanyun_level || 1) >= 2) {
						return false;
					}
					const total = game.players.length + game.dead.length;
					return (player.storage.wba_zhuanyun_count || 0) >= total;
				},
				async content(event, trigger, player) {
					player.awakenSkill("wba_xiaobenshengyi");
					game.log(player, "的使命“小本生意”成功");
					player.storage.wba_zhuanyun_level = 2;
					player.markSkill("wba_zhuanyun");
					await player.addSkills(["wba_zousi"]);
					await player.removeSkills(["wba_xiaobenshengyi"]);
				},
			},
			fail: {
				trigger: { player: "dying" },
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					player.awakenSkill("wba_xiaobenshengyi");
					game.log(player, "的使命“小本生意”失败");
					await player.removeSkills(["wba_zhuanyun", "wba_xiaobenshengyi"]);
				},
			},
		},
	},
	// 转运：准备阶段限一次，弃一张手牌并移动场上一张装备/判定牌；二级时若你牌数未增加，可令牌数增加的角色摸两张。
	wba_zhuanyun: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return player.countCards("h") > 0 && game.hasPlayer(cur => cur.countCards("ej") > 0);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseToDiscard("h", 1, get.prompt2("wba_zhuanyun"))
				.set("ai", card => 7 - get.value(card))
				.forResult();
		},
		async content(event, trigger, player) {
			const level = player.storage.wba_zhuanyun_level || 1;
			player.storage.wba_zhuanyun_count = (player.storage.wba_zhuanyun_count || 0) + 1;
			const before = new Map();
			game.filterPlayer().forEach(p => before.set(p, p.countCards("hej")));
			await player.moveCard(true, "转运：移动场上的一张装备牌或判定牌");
			if (level >= 2) {
				const selfIncreased = player.countCards("hej") > (before.get(player) || 0);
				const gained = game.filterPlayer().filter(p => p !== player && p.countCards("hej") > (before.get(p) || 0));
				if (!selfIncreased && gained.length) {
					const target = gained[0];
					const r = await player
						.chooseBool("转运：是否令" + get.translation(target) + "摸两张牌？")
						.set("ai", () => get.attitude(player, target) > 0)
						.forResult();
					if (r.bool) {
						await target.draw(2);
					}
				}
			}
			// 记录本回合准备阶段令其牌数增加的角色（供“走私”使用）
			const zeng = game.filterPlayer().filter(p => p !== player && p.countCards("hej") > (before.get(p) || 0));
			player.storage.wba_zhuanyun_zeng = zeng;
			player.storage.wba_zhuanyun_zeng_phase = trigger.getParent("phase");
		},
		mark: true,
		marktext: "运",
		intro: {
			content(storage, player) {
				return "“转运”等级：" + ((player.storage.wba_zhuanyun_level || 1) === 2 ? "二级" : "一级") + "；本局已发动" + (player.storage.wba_zhuanyun_count || 0) + "次";
			},
		},
	},
	// 走私：出牌阶段开始时，可与一名角色交换手牌；若其为本回合准备阶段你令其牌数增加的角色，则翻面。
	wba_zousi: {
		trigger: { player: "phaseUseBegin" },
		filter(event, player) {
			return game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_zousi"), lib.filter.notMe)
				.set("ai", target => {
					const diff = target.countCards("h") - player.countCards("h");
					return diff + (get.attitude(player, target) > 0 ? -3 : 0);
				})
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.line(target);
			await player.swapHandcards(target);
			const samePhase = player.storage.wba_zhuanyun_zeng_phase === trigger.getParent("phase");
			const zeng = samePhase ? player.storage.wba_zhuanyun_zeng || [] : [];
			if (zeng.includes(target)) {
				game.log(player, "与准备阶段令其牌数增加的角色交换了手牌，将武将牌翻面");
				await player.turnOver();
			}
		},
	},
	// FBI：背面朝上受到伤害时，摸X张牌（X为已损失体力）并翻回正面。
	wba_fbi: {
		trigger: { player: "damageEnd" },
		forced: true,
		filter(event, player) {
			return player.isTurnedOver();
		},
		async content(event, trigger, player) {
			const x = player.maxHp - player.hp;
			if (x > 0) {
				await player.draw(x);
			}
			await player.turnOver(false);
		},
	},

	/* ============ 研李博为 ============ */
	// 苦寒：使命技，你的杀造成伤害且目标有牌时，可防止伤害改为弃其两张牌。
	//        成功：本局发动≥4次，失去“苦寒”“自闭”获得“向阳”。失败：达成前进入濒死，失去“苦寒”。
	wba_kuhan: {
		dutySkill: true,
		derivation: ["wba_xiangyang"],
		group: ["wba_kuhan_effect", "wba_kuhan_achieve", "wba_kuhan_fail"],
		intro: {
			markcount(storage, player) {
				return player.storage.wba_kuhan_count || 0;
			},
			content(storage, player) {
				return "本局已发动“苦寒”" + (player.storage.wba_kuhan_count || 0) + "次";
			},
		},
		subSkill: {
			effect: {
				trigger: { source: "damageBegin1" },
				filter(event, player) {
					return event.card && event.card.name === "sha" && event.player && event.player.countCards("he") > 0;
				},
				async cost(event, trigger, player) {
					event.result = await player
						.chooseBool("苦寒：是否防止此伤害，改为弃置" + get.translation(trigger.player) + "两张牌？")
						.set("ai", () => get.attitude(player, trigger.player) < 0)
						.forResult();
				},
				async content(event, trigger, player) {
					trigger.cancel();
					player.storage.wba_kuhan_count = (player.storage.wba_kuhan_count || 0) + 1;
					player.markSkill("wba_kuhan");
					const num = Math.min(2, trigger.player.countCards("he"));
					if (num > 0) {
						await player.discardPlayerCard(trigger.player, "he", num, true);
					}
				},
			},
			achieve: {
				trigger: { player: "phaseZhunbeiBegin" },
				forced: true,
				locked: false,
				skillAnimation: true,
				animationColor: "fire",
				filter(event, player) {
					return (player.storage.wba_kuhan_count || 0) >= 4;
				},
				async content(event, trigger, player) {
					player.awakenSkill("wba_kuhan");
					game.log(player, "的使命“苦寒”成功");
					await player.changeSkills(["wba_xiangyang"], ["wba_kuhan", "wba_zibi"]);
				},
			},
			fail: {
				trigger: { player: "dying" },
				forced: true,
				locked: false,
				async content(event, trigger, player) {
					player.awakenSkill("wba_kuhan");
					game.log(player, "的使命“苦寒”失败");
					await player.removeSkills(["wba_kuhan"]);
				},
			},
		},
	},
	// 自闭：其他角色结束阶段，若本回合无角色受伤，可从弃牌堆随机获得一张基本牌。
	wba_zibi: {
		trigger: { global: "phaseJieshuBegin" },
		filter(event, player) {
			if (event.player === player) {
				return false;
			}
			if (game.hasPlayer(cur => cur.getHistory("damage").length > 0)) {
				return false;
			}
			return get.discardPile(card => get.type(card, null, false) === "basic") != undefined;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_zibi"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const cards = get.discardPile(card => get.type(card, null, false) === "basic", "random");
			const card = Array.isArray(cards) ? cards.randomGet() : cards;
			if (card) {
				await player.gain(card, "gain2");
				game.log(player, "从弃牌堆随机获得了一张基本牌");
			}
		},
	},
	// 向阳：锁定技，红色【杀】视为【火杀】且无视距离限制、不可被【闪】；每造成一次伤害，回复1点体力并从牌堆随机获得一张基本牌。
	wba_xiangyang: {
		locked: true,
		group: ["wba_xiangyang_fire", "wba_xiangyang_gain"],
		subSkill: {
			fire: {
				trigger: { player: "useCard" },
				forced: true,
				locked: true,
				mod: {
					targetInRange(card, player, target) {
						if (card.name === "sha" && get.color(card, player) === "red") {
							return true;
						}
					},
				},
				filter(event, player) {
					return event.card && event.card.name === "sha" && get.color(event.card, player) === "red";
				},
				async content(event, trigger, player) {
					game.setNature(trigger.card, "fire");
					if (trigger.directHit) {
						trigger.directHit.addArray(game.players);
					}
					game.log(player, "的红色【杀】视为【火杀】且无视距离限制、不可被【闪】抵消");
				},
			},
			gain: {
				trigger: { source: "damageEnd" },
				forced: true,
				locked: true,
				async content(event, trigger, player) {
					if (player.isDamaged()) {
						await player.recover();
					}
					const card = get.cardPile2(c => get.type(c, null, false) === "basic", "random");
					if (card) {
						await player.gain(card, "gain2");
						game.log(player, "从牌堆随机获得了一张基本牌");
					}
				},
			},
		},
	},
};

export const translate = {
	/* 武将名 */
	wba_yan_dushiyu: "研杜时宇",
	wba_yan_xujiashu: "研徐家澍",
	wba_yan_libowei: "研李博为",

	/* 研杜时宇 */
	wba_shiyan: "实验",
	wba_shiyan_info: "出牌阶段限一次，你可以从牌堆底亮出一张牌并展示，然后进行一次判定：若此牌与判定牌颜色相同，你将判定牌正面朝上置于武将牌上，称为“阅历”牌；若颜色不同，你失去1点体力，然后获得此牌与判定牌。你每有一张“阅历”牌，手牌上限+1。",
	wba_baichuan: "百川",
	wba_baichuan_info: "使命技。你使用牌时或成为其他角色使用牌的目标后，若该牌花色未被记录则记录之。准备阶段，若你已记录全部四种花色且“阅历”少于三张，你清空记录并将牌堆顶一张牌置为“阅历”。成功：“阅历”达到三张，你失去“百川”并获得“勃朗”。失败：进入濒死状态，或结束阶段若你本回合弃置了不少于体力值的牌，你失去“百川”。",
	wba_baichuan_record: "百川",
	wba_baichuan_zhunbei: "百川",
	wba_baichuan_achieve: "百川",
	wba_baichuan_fail: "百川",
	wba_bolang: "勃朗",
	wba_bolang_info: "其他角色计算与你的距离永久+1，你计算至其他角色的距离永久-1。出牌阶段限一次，你可以弃置一张“阅历”牌，然后观看一名其他角色的手牌并弃置其中与该“阅历”牌花色相同的牌。一名角色的判定牌生效前，你可以用一张“阅历”牌代替之。",
	wba_bolang_view: "勃朗",
	wba_bolang_judge: "勃朗",

	/* 研徐家澍 */
	wba_xiaobenshengyi: "小本生意",
	wba_xiaobenshengyi_info: "使命技。游戏开始时你获得“转运”。成功：准备阶段，若你本局发动“转运”的次数不小于本局游戏人数，你升级“转运”并获得“走私”。失败：达成使命前进入濒死状态，你失去“转运”。",
	wba_xiaobenshengyi_start: "小本生意",
	wba_xiaobenshengyi_achieve: "小本生意",
	wba_xiaobenshengyi_fail: "小本生意",
	wba_zhuanyun: "转运",
	wba_zhuanyun_info: "准备阶段限一次，你可以弃一张手牌并移动场上的一张装备牌或判定牌。（二级）若这样做后你的牌数未增加，你可以令牌数增加的角色摸两张牌。",
	wba_zousi: "走私",
	wba_zousi_info: "出牌阶段开始时，你可以选择一名角色并与其交换手牌。若其为你本回合准备阶段令其牌数增加的角色，你将武将牌翻面。",
	wba_fbi: "FBI",
	wba_fbi_info: "当你背面朝上受到伤害后，你摸X张牌（X为你已损失的体力值）并翻回正面。",

	/* 研李博为 */
	wba_kuhan: "苦寒",
	wba_kuhan_info: "使命技。当你的【杀】造成伤害时，若目标有牌，你可以防止此伤害，改为弃置其两张牌。成功：准备阶段，若你本局至少发动过四次“苦寒”，你失去“苦寒”和“自闭”，获得“向阳”。失败：达成使命前进入濒死状态，你失去“苦寒”。",
	wba_kuhan_effect: "苦寒",
	wba_kuhan_achieve: "苦寒",
	wba_kuhan_fail: "苦寒",
	wba_zibi: "自闭",
	wba_zibi_info: "其他角色的结束阶段，若本回合没有角色受到过伤害，你可以从弃牌堆中随机获得一张基本牌。",
	wba_xiangyang: "向阳",
	wba_xiangyang_info: "锁定技，你的红色【杀】视为【火杀】且无视距离限制、不能被【闪】抵消。你每造成一次伤害，回复1点体力并从牌堆中随机获得一张基本牌。",
	wba_xiangyang_fire: "向阳",
	wba_xiangyang_gain: "向阳",
};
