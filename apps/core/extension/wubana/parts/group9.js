import { lib, game, ui, get, ai, _status } from "noname";

/**
 * 五班阿扩展 —— 第九组：游（you）势力武将
 * 游宋轶健、游李博为、游杜时宇、游徐家澍
 * 含多个“协力技”（跨回合结算）与“延迟”盖置牌机制。
 */

// 赤史“智囊牌”：过河拆桥、无懈可击、无中生有
const WBA_ZHINANG = ["guohe", "wuxie", "wuzhong"];

// 判断一次使用是否为“非虚拟非转化”的实体锦囊
function wbaRealTrick(event) {
	if (!event || !event.card) {
		return false;
	}
	if (get.type(event.card, null, false) !== "trick") {
		return false;
	}
	if (event.card.isCard !== true) {
		return false;
	}
	const cards = event.cards || [];
	if (cards.length !== 1) {
		return false;
	}
	return get.name(cards[0]) === event.card.name;
}

// 巧匠效果：延迟牌成功结算后，令一名其他角色从牌堆获得一张同类型的牌
async function wbaQiaojiang(player, card) {
	const type = get.type2(card);
	if (!type) {
		return;
	}
	const r = await player
		.chooseTarget("巧匠：令一名其他角色从牌堆获得一张" + get.translation(type) + "牌", lib.filter.notMe)
		.set("ai", t => get.attitude(player, t))
		.forResult();
	if (!r.bool || !r.targets || !r.targets.length) {
		return;
	}
	const target = r.targets[0];
	const pileCard = get.cardPile2(c => get.type2(c) === type);
	if (!pileCard) {
		return;
	}
	player.line(target, "green");
	await target.gain(pileCard, "gain2");
	if (type === "equip") {
		const r2 = await target
			.chooseBool("巧匠：是否将获得的" + get.translation(pileCard) + "直接置入装备区？")
			.set("ai", () => true)
			.forResult();
		if (r2.bool && get.position(pileCard) === "h") {
			await target.equip(pileCard);
		}
	}
}

export const character = {
	wba_you_songyijian: { sex: "male", group: "you", hp: 3, skills: ["wba_tongzhi", "wba_chishi", "wba_zhanshu"] },
	wba_you_libowei: { sex: "male", group: "you", hp: 4, skills: ["wba_changye", "wba_huoba", "wba_huiyingde"] },
	wba_you_dushiyu: { sex: "male", group: "you", hp: 4, skills: ["wba_yanchi", "wba_qiaojiang", "wba_yingnima"] },
	wba_you_xujiashu: { sex: "male", group: "you", hp: 4, skills: ["wba_chuangxin", "wba_heirenpaipiqiu", "wba_lixia"] },
};

export const skill = {
	/* ============ 游宋轶健 ============ */
	// 同质：成为其他角色使用锦囊牌的目标且未记录该牌名时，可暗置记录牌名并取消对你的结算。
	wba_tongzhi: {
		trigger: { target: "useCardToTargeted" },
		filter(event, player) {
			if (event.player === player || event.target !== player) {
				return false;
			}
			if (get.type(event.card, null, false) !== "trick") {
				return false;
			}
			return !(player.storage.wba_tongzhi || []).includes(event.card.name);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool("同质：是否暗置记录【" + get.translation(trigger.card.name) + "】并取消此牌对你的结算？")
				.set("ai", () => get.effect(player, trigger.card, trigger.player, player) <= 0)
				.forResult();
		},
		async content(event, trigger, player) {
			if (!player.storage.wba_tongzhi) {
				player.storage.wba_tongzhi = [];
			}
			player.storage.wba_tongzhi.add(trigger.card.name);
			player.markSkill("wba_tongzhi");
			const parent = trigger.getParent();
			if (parent && Array.isArray(parent.targets)) {
				parent.targets.remove(player);
			}
			if (Array.isArray(trigger.targets)) {
				trigger.targets.remove(player);
			}
			game.log(player, "暗置记录了", "#g【" + get.translation(trigger.card.name) + "】", "，取消其对自己的结算");
		},
		intro: {
			markcount(storage) {
				return (storage || []).length;
			},
			content(storage, player) {
				// “暗置”记录，仅本人可见具体牌名，其他玩家只能看到已暗置的数量
				if (player !== game.me && !_status.video) {
					return "已暗置记录了一些锦囊牌名，具体内容仅" + get.translation(player) + "本人可见";
				}
				const s = player.storage.wba_tongzhi || [];
				return s.length ? "已记录牌名：" + s.map(n => get.translation(n)).join("、") : "未记录牌名";
			},
		},
	},
	// 赤史：锁定技，一名角色使用非虚拟非转化锦囊牌，若牌名属于智囊或已被“同质”记录，则你摸一张牌。
	wba_chishi: {
		locked: true,
		trigger: { global: "useCard" },
		forced: true,
		filter(event, player) {
			if (!wbaRealTrick(event)) {
				return false;
			}
			const recorded = player.storage.wba_tongzhi || [];
			return WBA_ZHINANG.includes(event.card.name) || recorded.includes(event.card.name);
		},
		async content(event, trigger, player) {
			await player.draw();
		},
	},
	// 战术：协力技，准备阶段可指定一名其他角色并移除一个已记录牌名；若其接下来一个回合使用该牌名的实体锦囊，你在其入弃牌堆前获得之。
	wba_zhanshu: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return (player.storage.wba_tongzhi || []).length > 0 && game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_zhanshu"), lib.filter.notMe)
				.set("ai", target => 1 + get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			const recorded = (player.storage.wba_tongzhi || []).slice();
			const vcards = recorded.map(n => ["", "", n]);
			const r = await player
				.chooseButton(["战术：移除一个已记录的锦囊牌名（协力目标：" + get.translation(target) + "）", [vcards, "vcard"]], true)
				.forResult();
			if (!r.bool || !r.links || !r.links.length) {
				return;
			}
			const name = r.links[0][2];
			player.storage.wba_tongzhi.remove(name);
			player.markSkill("wba_tongzhi");
			player.storage.wba_zhanshu_pending = { target, name };
			player.addTempSkill("wba_zhanshu_watch", { player: "dieAfter" });
			player.line(target, "green");
			game.log(player, "对", target, "发起“战术”，牌名", "#g【" + get.translation(name) + "】");
		},
	},
	wba_zhanshu_watch: {
		charlotte: true,
		trigger: { global: ["useCardAfter", "phaseAfter"] },
		forced: true,
		popup: false,
		filter(event, player) {
			const pending = player.storage.wba_zhanshu_pending;
			if (!pending) {
				return false;
			}
			if (event.name === "phase") {
				return event.player === pending.target;
			}
			if (event.player !== pending.target) {
				return false;
			}
			if (_status.currentPhase !== pending.target) {
				return false;
			}
			if (!wbaRealTrick(event) || event.card.name !== pending.name) {
				return false;
			}
			return (event.cards || []).some(c => ["d", "j"].includes(get.position(c)));
		},
		async content(event, trigger, player) {
			if (trigger.name === "phase") {
				delete player.storage.wba_zhanshu_pending;
				player.removeSkill("wba_zhanshu_watch");
				return;
			}
			const gains = (trigger.cards || []).filter(c => ["d", "j"].includes(get.position(c)));
			if (gains.length) {
				player.line(trigger.player, "green");
				await player.gain(gains, "gain2");
				game.log(player, "“战术”协力成功，获得了", gains);
			}
			delete player.storage.wba_zhanshu_pending;
			player.removeSkill("wba_zhanshu_watch");
		},
	},

	/* ============ 游李博为 ============ */
	// 长夜：锁定技，你的“桃”和“桃园结义”均视为“酒”。
	wba_changye: {
		locked: true,
		mod: {
			cardname(card, player) {
				if (card.name === "tao" || card.name === "taoyuan") {
					return "jiu";
				}
			},
		},
	},
	// 火把：限定技，濒死或结束阶段满足条件时，回复至1血并对一名角色造成X-1点火焰伤害并弃其手牌装备。
	wba_huoba: {
		limited: true,
		skillAnimation: true,
		animationColor: "fire",
		trigger: { global: "dying", player: "phaseJieshuBegin" },
		filter(event, player) {
			if (player.awakenedSkills.includes("wba_huoba")) {
				return false;
			}
			return get.info("wba_huoba").countConditions(player) >= 2;
		},
		countConditions(player) {
			let cnt = 0;
			if (player.hp <= 0) {
				cnt++;
			}
			if (player.countCards("h") === 0) {
				cnt++;
			}
			const mode = get.mode();
			if (mode === "identity" || mode === "guozhan") {
				const minHp = Math.min(...game.filterPlayer().map(p => p.hp));
				if (player.hp === minHp && game.countPlayer(p => p.hp === minHp) === 1) {
					cnt++;
				}
			} else {
				// 斗地主/双打对决等团队模式：场上没有其他友方角色存活
				if (!game.hasPlayer(p => p !== player && p.side === player.side)) {
					cnt++;
				}
			}
			return cnt;
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt("wba_huoba"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			player.awakenSkill("wba_huoba");
			if (player.hp < 1) {
				await player.recover(1 - player.hp);
			}
			const r = await player
				.chooseTarget("火把：选择一名角色，对其造成X-1点火焰伤害（X为其体力值）并弃置其手牌与装备", true)
				.set("ai", target => 2 - get.attitude(player, target))
				.forResult();
			if (r.bool && r.targets && r.targets.length) {
				const target = r.targets[0];
				player.line(target, "fire");
				const x = target.hp;
				const cards = target.getCards("he");
				if (cards.length) {
					await target.discard(cards);
				}
				if (x - 1 > 0) {
					await target.damage(x - 1, "fire", player);
				}
			}
			if (_status.currentPhase === player && _status.event.getParent("phaseUse")) {
				player.skip("phaseDiscard");
				const pu = _status.event.getParent("phaseUse");
				if (pu) {
					pu.finish();
				}
			}
		},
		ai: {
			order: 1,
			result: { player: 1 },
		},
	},
	// 会赢的：协力技，回合开始阶段指定一名其他角色，在你本回合与其下一回合内共同满足条件获得奖励。
	wba_huiyingde: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_huiyingde"), lib.filter.notMe)
				.set("ai", target => 1 + get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.wba_huiyingde_data = { target, damage: 0, gain: 0, points: [], mono: true };
			player.addTempSkill("wba_huiyingde_watch", { player: "dieAfter" });
			player.line(target, "green");
			game.log(player, "对", target, "发起“会赢的”协力");
		},
	},
	wba_huiyingde_watch: {
		charlotte: true,
		trigger: { global: ["damageEnd", "gainAfter", "useCardAfter", "phaseAfter"] },
		forced: true,
		popup: false,
		silent: true,
		filter(event, player) {
			const d = player.storage.wba_huiyingde_data;
			if (!d) {
				return false;
			}
			const inWindow = p => p === player || p === d.target;
			if (event.name === "phase") {
				return event.player === d.target;
			}
			if (event.name === "damage") {
				return event.source && inWindow(event.source) && event.num > 0;
			}
			if (event.name === "gain") {
				return inWindow(event.player) && (event.cards || []).length > 0;
			}
			if (event.name === "useCard") {
				return inWindow(event.player);
			}
			return false;
		},
		async content(event, trigger, player) {
			const d = player.storage.wba_huiyingde_data;
			if (trigger.name === "phase") {
				const target = d.target;
				if (d.damage >= 4) {
					await player.draw(3);
				}
				if (d.mono && d.points.length >= 1) {
					if (player.isDamaged()) {
						await player.recover();
					}
					if (target.isIn() && target.isDamaged()) {
						await target.recover();
					}
				}
				if (d.gain > 6) {
					player.addSkill("wba_huiyingde_sha");
					game.log(player, "下一回合使用【杀】无次数限制");
				}
				game.log(player, "“会赢的”协力结算完毕");
				delete player.storage.wba_huiyingde_data;
				player.removeSkill("wba_huiyingde_watch");
				return;
			}
			if (trigger.name === "damage") {
				d.damage += trigger.num;
			} else if (trigger.name === "gain") {
				d.gain += (trigger.cards || []).length;
			} else if (trigger.name === "useCard") {
				const pt = get.number(trigger.card, trigger.player) || 0;
				if (d.points.length && pt <= d.points[d.points.length - 1]) {
					d.mono = false;
				}
				d.points.push(pt);
			}
		},
	},
	wba_huiyingde_sha: {
		mod: {
			cardUsable(card, player, num) {
				if (card.name === "sha") {
					return Infinity;
				}
			},
		},
		trigger: { player: "phaseUseEnd" },
		forced: true,
		silent: true,
		popup: false,
		async content(event, trigger, player) {
			player.removeSkill("wba_huiyingde_sha");
		},
		intro: { content: "下一回合使用【杀】无次数限制" },
		mark: true,
		marktext: "赢",
	},

	/* ============ 游杜时宇 ============ */
	// 延迟：锁定技，出牌阶段你使用的手牌会被强制盖置于武将牌上（不选目标、不结算、不计入次数）；结束阶段依序翻开并结算。
	wba_yanchi: {
		locked: true,
		trigger: { player: "useCardBegin" },
		forced: true,
		filter(event, player) {
			return get.position(event.card) === "h" && _status.currentPhase === player;
		},
		// 这里只做同步操作，cancel() 是唯一/最后一句：cancel() 会强制 finish 掉仍处于
		// #inContent 中的祖先 arrangeTrigger 事件，若在同一分支里再 await 一个自身会产生
		// 新触发级联的引擎事件（如 addToExpansion 内部创建的 lose 事件，可被任意角色的
		// loseBegin/loseAfter/addToExpansionAfter 监听到），会与已被强制结束的祖先上下文
		// 冲突，导致静默卡死（不报错、控制台无输出）。真正的盖置动作挪到 useCardCancelled
		// 子技能里执行，那是 cancel() 自己触发的一次全新、非嵌套的 arrangeTrigger 流程。
		async content(event, trigger, player) {
			trigger._wba_yanchi_cover = trigger.card;
			trigger.cancel();
		},
		group: ["wba_yanchi_resolve", "wba_yanchi_cover"],
		marktext: "延",
		intro: {
			markcount(storage, player) {
				return player.getExpansions("wba_yanchi").length;
			},
			content(storage, player) {
				const n = player.getExpansions("wba_yanchi").length;
				return n ? "武将牌上盖置了" + get.cnNumber(n) + "张“延迟”牌" : "没有“延迟”牌";
			},
		},
		subSkill: {
			cover: {
				locked: true,
				forced: true,
				silent: true,
				popup: false,
				trigger: { player: "useCardCancelled" },
				filter(event, player) {
					return event._wba_yanchi_cover === event.card && get.position(event.card) === "h" && _status.currentPhase === player;
				},
				async content(event, trigger, player) {
					const card = trigger._wba_yanchi_cover;
					delete trigger._wba_yanchi_cover;
					if (!player.storage.wba_yanchi_list) {
						player.storage.wba_yanchi_list = [];
					}
					const next = player.addToExpansion([card], player, "give");
					next.gaintag.add("wba_yanchi");
					await next;
					player.storage.wba_yanchi_list.push(card);
					player.markSkill("wba_yanchi");
					game.log(player, "将", card, "“延迟”盖置于武将牌上");
				},
			},
			resolve: {
				trigger: { player: "phaseJieshuBegin" },
				forced: true,
				locked: true,
				filter(event, player) {
					return player.getExpansions("wba_yanchi").length > 0;
				},
				async content(event, trigger, player) {
					const order = player.storage.wba_yanchi_list || [];
					const remaining = player.getExpansions("wba_yanchi");
					const cards = order.filter(c => remaining.includes(c));
					for (const c of remaining) {
						if (!cards.includes(c)) {
							cards.push(c);
						}
					}
					for (const card of cards) {
						if (!player.getExpansions("wba_yanchi").includes(card)) {
							continue;
						}
						game.log(player, "翻开“延迟”盖置的", card);
						await player.gain([card], "gain2");
						const usable = player.hasUseTarget(card, false, false) || game.hasPlayer(t => player.canUse(card, t, false));
						if (usable) {
							await player.chooseUseTarget(card, true, false);
							if (player.hasSkill("wba_qiaojiang")) {
								await wbaQiaojiang(player, card);
							}
						} else if (player.getCards("h").includes(card)) {
							await player.discard(card);
							game.log(card, "无法指定有效目标，置入弃牌堆");
						}
					}
					player.storage.wba_yanchi_list = [];
					player.unmarkSkill("wba_yanchi");
				},
			},
		},
	},
	// 巧匠：配合“延迟”，每张成功结算的延迟牌可令一名其他角色从牌堆获得一张同类型牌（效果由“延迟”结算时触发）。
	wba_qiaojiang: {
		mark: true,
		marktext: "匠",
		intro: {
			content: "每当一张“延迟”盖置的牌被翻开并成功结算后，你可以令一名其他角色从牌堆获得一张相同类型的牌。",
		},
	},
	// 赢你妈：协力技，回合开始阶段指定一名其他角色，共造成0点伤害或共弃四种花色手牌则摸四张牌并扣置。
	wba_yingnima: {
		trigger: { player: "phaseZhunbeiBegin" },
		filter(event, player) {
			return game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseTarget(get.prompt2("wba_yingnima"), lib.filter.notMe)
				.set("ai", target => 1 + get.attitude(player, target))
				.forResult();
		},
		async content(event, trigger, player) {
			const target = event.targets[0];
			player.storage.wba_yingnima_data = { target, damage: 0, suits: [] };
			player.addTempSkill("wba_yingnima_watch", { player: "dieAfter" });
			player.line(target, "green");
			game.log(player, "对", target, "发起“赢你妈”协力");
		},
	},
	wba_yingnima_watch: {
		charlotte: true,
		trigger: { global: ["damageEnd", "loseAfter", "phaseAfter"] },
		forced: true,
		popup: false,
		silent: true,
		filter(event, player) {
			const d = player.storage.wba_yingnima_data;
			if (!d) {
				return false;
			}
			const inWindow = p => p === player || p === d.target;
			if (event.name === "phase") {
				return event.player === d.target;
			}
			if (event.name === "damage") {
				return event.source && inWindow(event.source) && event.num > 0;
			}
			if (event.name === "lose") {
				return event.type === "discard" && inWindow(event.player);
			}
			return false;
		},
		async content(event, trigger, player) {
			const d = player.storage.wba_yingnima_data;
			if (trigger.name === "phase") {
				const target = d.target;
				const success = d.damage === 0 || d.suits.length >= 4;
				if (success) {
					game.log(player, "“赢你妈”协力成功");
					const before = player.getCards("h").slice();
					await player.draw(4);
					const drawn = player.getCards("h").filter(c => !before.includes(c));
					if (drawn.length) {
						const r = await player
							.chooseControl(get.translation(player), target.isIn() ? get.translation(target) : get.translation(player))
							.set("prompt", "赢你妈：将摸到的牌背面朝上扣置于谁的武将牌上？")
							.set("ai", () => 0)
							.forResult();
						const owner = r.index === 1 && target.isIn() ? target : player;
						const next = owner.addToExpansion(drawn, owner, "give");
						next.gaintag.add("wba_yingnima_card");
						await next;
						if (!owner.hasSkill("wba_yingnima_gain")) {
							owner.addSkill("wba_yingnima_gain");
						}
						owner.markSkill("wba_yingnima_gain");
					}
				}
				delete player.storage.wba_yingnima_data;
				player.removeSkill("wba_yingnima_watch");
				return;
			}
			if (trigger.name === "damage") {
				d.damage += trigger.num;
			} else if (trigger.name === "lose") {
				for (const c of trigger.cards || []) {
					const s = get.suit(c);
					if (lib.suit.includes(s)) {
						d.suits.add(s);
					}
				}
			}
		},
	},
	wba_yingnima_gain: {
		trigger: { player: "phaseDrawBegin" },
		forced: true,
		filter(event, player) {
			return player.getExpansions("wba_yingnima_card").length > 0;
		},
		async content(event, trigger, player) {
			const cards = player.getExpansions("wba_yingnima_card");
			await player.gain(cards, "gain2");
			player.removeSkill("wba_yingnima_gain");
			game.log(player, "获得了扣置于武将牌上的牌");
		},
		marktext: "妈",
		intro: {
			markcount(storage, player) {
				return player.getExpansions("wba_yingnima_card").length;
			},
			content(storage, player) {
				const n = player.getExpansions("wba_yingnima_card").length;
				return n ? "武将牌上扣置了" + get.cnNumber(n) + "张牌，摸牌阶段开始时获得" : "无扣置牌";
			},
		},
	},

	/* ============ 游徐家澍 ============ */
	// 创新：协力技，结束阶段声明一种本回合未被使用/打出的非装备牌名并选至多两名其他角色，成功则获牌，失败令其失去非锁定技。
	wba_chuangxin: {
		trigger: { player: "phaseJieshuBegin" },
		filter(event, player) {
			return game.hasPlayer(cur => cur !== player);
		},
		async cost(event, trigger, player) {
			event.result = await player
				.chooseBool(get.prompt2("wba_chuangxin"))
				.set("ai", () => true)
				.forResult();
		},
		async content(event, trigger, player) {
			const usedNames = [];
			game.getGlobalHistory("useCard", evt => {
				if (evt.card) {
					usedNames.add(evt.card.name);
				}
			});
			game.filterPlayer().forEach(p => {
				for (const evt of p.getHistory("respond")) {
					if (evt.card) {
						usedNames.add(evt.card.name);
					}
				}
			});
			const names = (lib.inpile || []).filter(name => {
				const info = lib.card[name];
				return info && info.type !== "equip" && !usedNames.includes(name);
			});
			if (!names.length) {
				return;
			}
			const vcards = names.map(n => ["", "", n]);
			const r = await player
				.chooseButton(["创新：声明一种本回合场上未被使用或打出的非装备牌名", [vcards, "vcard"]], true)
				.set("ai", button => Math.random())
				.forResult();
			if (!r.bool || !r.links || !r.links.length) {
				return;
			}
			const name = r.links[0][2];
			game.log(player, "“创新”声明了", "#g【" + get.translation(name) + "】");
			const r2 = await player
				.chooseTarget("创新：选择至多两名其他角色", lib.filter.notMe)
				.set("selectTarget", [1, 2])
				.set("declaredName", name)
				.set("ai", t => (get.attitude(player, t) < 0 ? 1 : 0.1))
				.forResult();
			if (!r2.bool || !r2.targets || !r2.targets.length) {
				return;
			}
			const targets = r2.targets.slice();
			player.line(targets, "green");
			const success = targets.some(t => t.hasCard(c => c.name === name, "h"));
			if (success) {
				game.log(player, "“创新”协力成功");
				const pileCard = get.cardPile2(c => c.name === name);
				if (pileCard) {
					await player.gain(pileCard, "gain2");
				}
			} else {
				game.log(player, "“创新”协力失败");
				for (const t of targets) {
					t.addTempSkill("wba_chuangxin_disable", { player: "phaseZhunbeiBegin" });
				}
			}
		},
	},
	wba_chuangxin_disable: {
		charlotte: true,
		locked: true,
		mark: true,
		marktext: '<span style="text-decoration: line-through;">技</span>',
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
			content: "失去非锁定技直到下个回合开始",
		},
	},
	// 黑人拍皮球：锁定技，黑色锦囊牌对你无效；你的黑色伤害类锦囊造成的伤害+1。
	wba_heirenpaipiqiu: {
		locked: true,
		group: ["wba_heirenpaipiqiu_immune", "wba_heirenpaipiqiu_damage"],
		subSkill: {
			immune: {
				trigger: { target: "useCardToTargeted" },
				forced: true,
				locked: true,
				filter(event, player) {
					return event.target === player && get.type(event.card, null, false) === "trick" && get.color(event.card, event.player) === "black";
				},
				async content(event, trigger, player) {
					const parent = trigger.getParent();
					if (parent && Array.isArray(parent.targets)) {
						parent.targets.remove(player);
					}
					if (Array.isArray(trigger.targets)) {
						trigger.targets.remove(player);
					}
					game.log(trigger.card, "对", player, "无效");
				},
			},
			damage: {
				trigger: { source: "damageBegin1" },
				forced: true,
				locked: true,
				filter(event, player) {
					return event.card && get.type(event.card, null, false) === "trick" && get.color(event.card, player) === "black";
				},
				async content(event, trigger, player) {
					trigger.num++;
				},
			},
		},
	},
	// 篱下：锁定技，出牌阶段你至多使用X张牌（X为体力值）。
	wba_lixia: {
		locked: true,
		trigger: { player: "useCard2" },
		forced: true,
		silent: true,
		popup: false,
		filter(event, player) {
			if (!event.getParent("phaseUse")) {
				return false;
			}
			const used = player.getHistory("useCard", evt => !!evt.getParent("phaseUse")).length;
			return used >= Math.max(1, player.getHp());
		},
		async content(event, trigger, player) {
			const pu = trigger.getParent("phaseUse");
			if (pu) {
				pu.finish();
			}
			game.log(player, "“篱下”结束出牌阶段");
		},
	},
};

export const translate = {
	/* 武将名 */
	wba_you_songyijian: "游宋轶健",
	wba_you_libowei: "游李博为",
	wba_you_dushiyu: "游杜时宇",
	wba_you_xujiashu: "游徐家澍",

	/* 游宋轶健 */
	wba_tongzhi: "同质",
	wba_tongzhi_info: "当你成为其他角色使用的锦囊牌的目标时，若你的“同质”未记录过该牌名，你可以将此牌名暗置记录（背面朝上置于武将牌上，全场仅你可见），然后取消此牌对你的目标结算。",
	wba_chishi: "赤史",
	wba_chishi_info: "锁定技，当一名角色使用非虚拟非转化的锦囊牌时，若该牌名属于智囊牌名或已经被“同质”记录，则你摸一张牌。",
	wba_zhanshu: "战术",
	wba_zhanshu_info: "协力技，准备阶段，你可以指定一名其他角色并从“同质”已记录的牌名中移除一种锦囊牌名。若该角色于其接下来的一个回合中使用非虚拟非转化的该牌名的锦囊牌，则协力成功：此锦囊牌进入弃牌堆前，你获得之。",
	wba_zhanshu_watch: "战术",

	/* 游李博为 */
	wba_changye: "长夜",
	wba_changye_info: "锁定技，你的“桃”和“桃园结义”均视为“酒”。",
	wba_huoba: "火把",
	wba_huoba_info: "限定技，当有角色进入濒死阶段或你进入回合结束阶段时，若满足以下三个条件中的任意两种（1.你处于濒死状态；2.你没有手牌；3.身份场：你的体力值为全场唯一最低，其他模式：场上没有其他友方角色存活），则你将体力回复至一点，并选择一名角色对其造成X-1点火焰伤害（X为其体力值）并弃置其手牌与装备。若当前处于你的出牌阶段，你立刻进入回合结束阶段。",
	wba_huiyingde: "会赢的",
	wba_huiyingde_info: "协力技，回合开始阶段，你可以指定一名其他角色。若在你的这一回合与该角色的下一回合内：1.共造成至少四点伤害，则你摸三张牌；2.出牌点数均为单调递增，则各回复一点体力；3.共获得超过六张牌，则你下一回合使用“杀”无次数限制。",
	wba_huiyingde_watch: "会赢的",
	wba_huiyingde_sha: "会赢的",

	/* 游杜时宇 */
	wba_yanchi: "延迟",
	wba_yanchi_info: "锁定技，出牌阶段，你使用的手牌不选择目标且不执行结算，改为依序背面朝上盖置于你的武将牌上（以此法盖置【杀】不计入次数限制）。你的回合结束阶段开始时，你将“延迟”盖置的牌依序翻开，为其选择合法目标并依次结算；若无法指定有效目标，则直接置入弃牌堆。",
	wba_yanchi_resolve: "延迟",
	wba_qiaojiang: "巧匠",
	wba_qiaojiang_info: "回合结束阶段，每当一张“延迟”盖置的牌被翻开并成功执行结算后，你可以选择一名其他角色从牌堆中获得一张相同类型的牌加入手牌。若该牌为装备牌，该角色可选择将其直接置入装备区。",
	wba_yingnima: "赢你妈",
	wba_yingnima_info: "协力技，回合开始阶段，你可以指定一名其他角色。若在你的这一回合与该角色的下一回合内共造成0点伤害，或共弃掉四种花色的手牌，则你摸四张牌，然后将以此法摸到的四张牌背面朝上扣置于你或该角色的武将牌上。拥有扣置牌的角色的下个摸牌阶段开始时获得此牌。",
	wba_yingnima_watch: "赢你妈",
	wba_yingnima_gain: "赢你妈",

	/* 游徐家澍 */
	wba_chuangxin: "创新",
	wba_chuangxin_info: "协力技，回合结束阶段，你声明一种本回合场上未被使用或打出的非装备牌名，并选择至多两名其他角色。若至少一名角色拥有至少一张与该牌名相同的手牌，则协力成功：若牌堆中有该牌名的牌，你获得其中一张；否则协力失败：你选择的其他角色失去非锁定技直到其下个回合开始阶段。",
	wba_chuangxin_disable: "创新",
	wba_heirenpaipiqiu: "黑人拍皮球",
	wba_heirenpaipiqiu_info: "锁定技，黑色锦囊牌对你无效，你的黑色伤害类锦囊造成的伤害+1。",
	wba_lixia: "篱下",
	wba_lixia_info: "锁定技，出牌阶段，你至多使用X张牌（X为你的体力值）。",
};
