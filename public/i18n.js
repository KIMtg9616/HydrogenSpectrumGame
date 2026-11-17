// Keys intentionally remain stable across all game modes and languages.
const rows={
hero:['수소의 빛을 완성하라!','Complete the light of hydrogen!','水素の光を完成させよう！','点亮氢原子的光谱！'],intro:['에너지를 흡수하고 방출하며 여섯 가지 빛을 모으는 양자 카드 게임. 친구와 경쟁하거나 혼자 연습해 보세요.','Absorb and emit energy to collect six spectral lines. Challenge friends or practice solo.','エネルギーを吸収・放出し、6本のスペクトル線を集めよう。','吸收与释放能量，收集六条光谱线。与朋友对战或独自练习。'],solo:['싱글플레이','Solo practice','一人練習','单人练习'],ai:['AI 대전','AI battle','AI対戦','AI 对战'],online:['온라인 멀티플레이','Online multiplayer','オンライン対戦','在线多人'],soloDesc:['나만의 스펙트럼을 완성하는 연습','Complete your spectrum at your own pace.','自分のペースでスペクトルを完成。','按自己的节奏完成光谱。'],aiDesc:['컴퓨터 참가자 최대 3명과 경쟁','Play against up to 3 computer players.','最大3人のAIと対戦。','与最多三名电脑玩家对战。'],onlineDesc:['친구와 방 코드로 접속 · 최대 4명','Join friends with a room code · up to 4.','ルームコードで最大4人。','房间代码加入，最多4人。'],start:['시작하기','Start','開始','开始'],create:['방 만들기','Create room','部屋を作る','创建房间'],join:['참가하기','Join room','参加','加入'],name:['닉네임','Nickname','ニックネーム','昵称'],mode:['게임 모드','Game mode','モード','模式'],normal:['일반 · 6종','Classic · 6 lines','通常・6本','普通 · 6条'],speed:['스피드 · 3종','Sprint · 3 lines','スピード・3本','快速 · 3条'],timed:['5분 제한','5-minute challenge','5分チャレンジ','5分钟挑战'],learn:['학습 · 6종 + 힌트','Learn · 6 lines + hints','学習・6本＋ヒント','学习 · 6条与提示'],opponents:['AI 인원','AI opponents','AI人数','电脑人数'],roomSize:['최대 인원','Room capacity','最大人数','最大人数'],code:['방 코드','Room code','ルームコード','房间代码'],copy:['초대 링크 복사','Copy invite link','招待リンクをコピー','复制邀请链接'],copied:['링크를 복사했습니다.','Invite copied.','コピーしました。','已复制。'],lobby:['게임 대기실','Game lobby','待機室','游戏大厅'],ready:['준비 완료','Ready','準備完了','准备'],unready:['준비 취소','Not ready','準備取消','取消准备'],waiting:['대기 중','Waiting','待機中','等待中'],host:['방장','Host','ホスト','房主'],leave:['나가기','Leave','退出','离开'],startGame:['게임 시작','Start game','ゲーム開始','开始游戏'],round:['라운드','Round','ラウンド','回合'],turn:['차례','Turn','ターン','回合'],yourTurn:['나의 차례','Your turn','あなたの番','你的回合'],draw:['카드 2장 뽑기','Draw two cards','カードを2枚引く','抽两张牌'],choose:['카드 한 장을 선택하세요','Choose one card','カードを1枚選択','选择一张牌'],redraw:['다시 뽑기','Redraw','引き直し','重抽'],redrawHint:['교체할 카드 한 장을 선택하세요.','Select one card to replace.','交換するカードを選択。','选择一张要替换的牌。'],redrawAvailable:['다시 뽑기 기회 1회','One redraw available','引き直し1回','可重抽一次'],cancel:['취소','Cancel','キャンセル','取消'],pass:['차례 종료','End turn','ターン終了','结束回合'],energy:['에너지 준위','Energy levels','エネルギー準位','能级'],spectrum:['나의 수소 스펙트럼','My hydrogen spectrum','私の水素スペクトル','我的氢光谱'],activity:['게임 기록','Activity log','ゲーム記録','游戏记录'],stats:['나의 통계','My stats','統計','我的统计'],transitions:['전이 성공','Transitions','遷移成功','跃迁成功'],turns:['개인 차례','Turns taken','自分のターン','个人回合'],cards:['카드 사용','Cards played','使用カード','出牌数'],photons:['방출 횟수','Emissions','放出回数','发射次数'],deck:['뽑기 더미','Draw pile','山札','牌堆'],discard:['버린 카드','Discard pile','捨て札','弃牌堆'],collected:['수집','Collected','収集','已收集'],absorb:['흡수','Absorption','吸収','吸收'],emit:['방출','Emission','放出','发射'],up:['자유 흡수','Quantum Up','自由吸収','自由吸收'],down:['자유 방출','Quantum Down','自由放出','自由发射'],wild:['빛 카드','Photon Wild','光カード','光子牌'],steal:['빛 훔치기','Photon Heist','光を奪う','夺取光'],break:['빛 제거','Spectrum Break','光を除去','移除光'],valid:['사용 가능','Available','使用可能','可使用'],invalid:['사용 불가','Unavailable','使用不可','不可使用'],pick:['효과를 선택하세요','Choose an effect','効果を選択','选择效果'],close:['닫기','Close','閉じる','关闭'],rules:['게임 규칙','Game rules','ゲームルール','游戏规则'],win:['스펙트럼 완성!','Spectrum complete!','スペクトル完成！','光谱完成！'],winner:['승리','Winner','勝利','获胜'],time:['시간 종료','Time is up','時間終了','时间到'],again:['다시 플레이','Play again','もう一度','再玩一次'],menu:['메인 메뉴','Main menu','メインメニュー','主菜单'],you:['나','You','自分','你'],connected:['온라인','Online','オンライン','在线'],reconnecting:['연결 확인 중','Reconnecting','再接続中','正在重连'],local:['로컬 게임','Local game','ローカルゲーム','本地游戏'],skip:['지연된 차례 넘기기','Skip stalled turn','遅延ターンをスキップ','跳过超时回合'],hint:['힌트: 현재 에너지에 카드의 값을 더해 보세요. 정확히 표시된 준위가 되어야 합니다.','Hint: add the card value to your energy. The result must be a listed level.','ヒント：現在のエネルギーにカードの値を足すと、表示準位に一致する必要があります。','提示：当前能量加上牌值，结果必须是所列能级。'],science:['게임 에너지는 실제 eV 값에 비례하지 않습니다. 표시색은 게임용이며 UV·IR은 보이지 않습니다. 목표 외 하향 전이도 광자를 방출합니다.','Game energy is not proportional to real eV. Colors are symbolic; UV/IR are invisible. Other downward transitions also emit photons in this model.','ゲームのエネルギーは実際のeVに比例しません。色は記号で、UV・IRは不可視です。目標外の下向き遷移も光子を放出します。','游戏能量与真实电子伏特不成比例。颜色为示意，UV/IR不可见。非目标向下跃迁也释放光子。'],rulesText:['79장: ±1,2,3,4,5,6,7,13 각 3장; 자유 흡수·방출·빛 각 5장; 다시 뽑기 10장; 훔치기·제거 각 3장. 매 차례 두 장을 뽑고 한 장만 사용합니다. 이동 가능한 준위에만 전이하며 새 방출선만 수집합니다. 다시 뽑기는 즉시 버리고 두 장을 채운 후 한 장을 한 번 교체할 수 있습니다. 교체 카드가 다시 뽑기면 버립니다. 모든 카드는 사용 후 버림 더미로 이동합니다. 훔치기는 미수집 상대 토큰을 가져오고 제거는 상대 토큰을 영구 버립니다. 6종(스피드 3종)을 먼저 모으면 승리. 5분 모드는 시간 종료 시 최다 수집자가 승리하며 동점은 공동 승리입니다.','79 cards: ±1,2,3,4,5,6,7,13 (3 each); Up, Down, Wild (5 each); Redraw (10); Heist, Break (3 each). Draw two, use at most one. Move only to listed levels; collect new target lines. Redraw cards are discarded while filling two slots, then allow one replacement. A replacement Redraw is discarded. Discard all drawn cards. Heist transfers a missing line; Break permanently removes a rival token. Collect 6 lines (3 in Sprint) to win. In timed mode the most lines at 5 minutes wins; ties are shared.','79枚：±1,2,3,4,5,6,7,13各3枚、自由吸収・放出・光各5枚、引き直し10枚、奪う・除去各3枚。2枚引いて1枚だけ使用。存在する準位に移動し、新しい目標線を収集。引き直しは捨てて2枚を補充し、1枚を一度交換。交換で引き直しを引いたら捨てる。全カードは捨て札へ。奪うカードは未収集の線を移し、除去は永久に捨てる。6本（スピード3本）で勝利。5分モードは最多収集者が勝ち、同点は共同勝利。','79张：±1,2,3,4,5,6,7,13各3张，自由吸收、释放、光子各5张，重抽10张，夺取、移除各3张。每回合抽两张，最多用一张。只能到达指定能级，收集新的目标谱线。重抽牌先弃掉并补足两张，再替换一张一次；若替换抽到重抽则弃掉。所有牌进入弃牌堆。夺取可转移缺少的谱线，移除永久丢弃对手光子。集齐6条（快速3条）获胜。5分钟模式最多者胜，并列共享胜利。'],offline:['오프라인에서는 연습과 AI 대전만 가능합니다.','Offline: solo and AI modes only.','オフラインは練習・AIのみ。','离线仅支持单人及AI。'],roomError:['요청을 처리할 수 없습니다. 방 코드, 접속 상태 및 차례를 확인하세요.','Request failed. Check the room code, connection and turn.','接続・コード・ターンを確認してください。','请求失败，请检查房间代码、网络和回合。'],drawLog:['카드를 뽑았습니다','drew cards','カードを引いた','抽牌'],passLog:['차례를 종료했습니다','ended the turn','ターン終了','结束回合'],nonTarget:['목표 외 광자 방출 · 토큰 없음','Other photon emitted · no token','対象外の光子放出・トークンなし','非目标光子发射 · 无令牌'],token:['빛 토큰','Photon token','光トークン','光子令牌'],noStock:['재고 없음 또는 중복','Out of stock or duplicate','在庫なし・重複','库存不足或重复'],empty:['기록 없음','No activity yet','記録なし','暂无记录'],sound:['효과음','Sound effects','効果音','音效'],music:['배경음악','Music','BGM','背景音乐'],voice:['음성 안내','Voice guide','音声案内','语音引导'],fullscreen:['전체화면','Fullscreen','全画面','全屏'],exitConfirm:['게임에서 나가시겠습니까?','Leave the game?','ゲームを退出しますか？','退出游戏？'],restore:['이전 게임방 재접속','Reconnect to room','ルーム再接続','重新连接房间'],install:['홈 화면에 추가','Install app','ホーム画面に追加','添加到主屏幕'],installHint:['브라우저 메뉴의 홈 화면에 추가/앱 설치를 사용하세요.','Use Add to Home Screen / Install in the browser menu.','ブラウザメニューからホーム画面に追加。','使用浏览器菜单添加到主屏幕。']};
export const languages=['ko','en','ja','zh'];export function tr(key,lang='ko'){return rows[key]?.[languages.indexOf(lang)]||rows[key]?.[0]||key}
Object.assign(rows,{
playNow:['빛 수집 시작','Start collecting','光を集める','开始集光'],howTo:['플레이 방법','How to play','遊び方','玩法说明'],chooseExperience:['나의 플레이 선택','Choose your experience','プレイを選ぶ','选择玩法'],soloTime:['나의 속도로 · 3–5분','Your pace · 3–5 min','自分のペース・3–5分','自己的节奏 · 3–5分'],versusTime:['전략을 겨루는 빛의 여정','A little friendly competition','光を巡る対戦','光谱策略对决'],onlineTime:['친구와 함께 · 2–4인','Together · 2–4 players','友達と・2–4人','和朋友一起 · 2–4人'],roomJoin:['코드로 참가','Join with a code','コードで参加','用代码加入'],customize:['플레이 설정','Play settings','プレイ設定','游戏设置'],soundHint:['첫 터치부터 음악과 함께. 우측 상단에서 끌 수 있어요.','Music starts on your first touch. Toggle it in the header.','最初のタッチで音楽が始まります。右上で切替できます。','首次触摸开始音乐，可在右上角关闭。'],cardGallery:['카드 도감','Card collection','カード図鑑','卡牌图鉴'],settings:['사용자 설정','Settings','ユーザー設定','用户设置'],master:['전체 음량','Master volume','全体音量','总音量'],fxVolume:['효과음 음량','Effects volume','効果音量','音效音量'],musicVolume:['음악 음량','Music volume','音楽音量','音乐音量'],reduced:['모션 줄이기','Reduce motion','動きを減らす','减少动画'],reducedDesc:['이동·반짝임·파티클 효과를 줄입니다.','Reduce motion, flashes and particles.','動き・点滅・粒子を減らします。','减少移动、闪烁和粒子。'],largeText:['글자 크게','Larger text','文字を大きく','放大文字'],voiceDesc:['내 차례와 최근 행동을 읽어 줍니다.','Read your turn and recent actions aloud.','自分の番と行動を読み上げます。','朗读回合和最近的操作。'],musicDesc:['우주를 닮은 오리지널 앰비언트 음악','An original ambient score for the cosmos','宇宙をイメージしたオリジナル音楽','原创宇宙氛围音乐'],sfxDesc:['카드·전이·광자마다 다른 효과음','Distinct card, transition and photon sounds','カード・遷移・光子ごとの効果音','卡牌、跃迁、光子的独立音效'],on:['켜짐','On','オン','开启'],off:['꺼짐','Off','オフ','关闭'],readyToDraw:['가능성을 펼쳐 볼 시간','A new possibility awaits','新しい可能性を開こう','开启新的可能'],drawHint:['두 장을 뽑고, 한 장을 선택하세요.','Draw two. Choose one.','2枚引いて、1枚選ぼう。','抽两张，选一张。'],chooseHint:['준위에 정확히 도달하는 카드만 사용할 수 있어요.','Only exact energy-level transitions are allowed.','正確に準位に届くカードだけ使えます。','只能使用恰好到达能级的牌。'],noMoves:['사용 가능한 카드가 없어요. 다시 뽑거나 차례를 넘겨 보세요.','No available cards. Redraw if offered, or end your turn.','使えるカードがありません。引き直しかターン終了。','没有可用牌，可重抽或结束回合。'],hoverHint:['카드에 마우스를 올리거나 초점을 맞추면 전이 경로가 보여요.','Hover or focus a card to preview its transition.','カードにカーソルを合わせると遷移を表示。','悬停或聚焦卡牌可预览跃迁。'],keyboard:['키보드: D 뽑기 · 1/2 카드 · P 차례 종료 · R 규칙','Keyboard: D draw · 1/2 card · P pass · R rules','キー：D 引く・1/2 カード・P 終了・R ルール','键盘：D 抽牌 · 1/2 卡牌 · P 结束 · R 规则'],symbolic:['UV · IR은 비가시광선 / 표시색은 모형입니다.','UV & IR are invisible / colors are symbolic.','UV・IRは不可視光 / 色はモデルです。','UV、IR不可见 / 颜色为示意。'],goal:['목표','Goal','目標','目标'],observe:['관측 기록','Observation log','観測記録','观测记录'],emptyDesc:['첫 카드를 뽑으면 빛의 여정이 기록됩니다.','Your light journey begins with the first draw.','最初のカードから光の記録が始まります。','从第一张牌开始记录光的旅程。'],arrival:['도착 준위','Destination','到着準位','目标能级'],collectLine:['새 스펙트럼 수집','Collect a new spectral line','新しいスペクトルを収集','收集新谱线'],noToken:['준위 이동 · 새 토큰 없음','Transition · no new token','準位移動・新トークンなし','能级跃迁 · 无新令牌'],visible:['가시광선','Visible light','可視光','可见光'],invisible:['비가시광선','Invisible light','不可視光','不可见光'],current:['현재 준위','Current level','現在準位','当前能级'],stepDraw:['카드를 뽑아요','Draw two cards','2枚引こう','抽取卡牌'],stepMove:['준위를 이동해요','Make a transition','準位を移動','能级跃迁'],stepCollect:['빛을 모아요','Collect the light','光を集める','收集光谱'],step1:['매 차례 공용 덱에서 두 장을 뽑고 한 장만 사용합니다.','Draw two from the shared deck. Play at most one.','共有の山札から2枚引き、1枚まで使用。','每回合抽两张，最多使用一张。'],step2:['현재 에너지에 카드 값을 더해, 존재하는 준위로만 이동합니다.','Add the card value. Land exactly on a listed level.','カード値を足し、存在する準位へ移動。','将卡牌值加到能量上，恰好到达能级。'],step3:['목표 방출선 여섯 종류를 먼저 모으면 승리합니다.','Collect all six target lines to win.','目標の放出線を6本集めて勝利。','率先集齐六种目标谱线获胜。'],line:['방출선','Spectral line','放出線','谱线'],transition:['목표 전이','Target transition','目標遷移','目标跃迁'],wavelength:['파장','Wavelength','波長','波长'],details:['자세한 카드 규칙','Detailed card rules','詳しいルール','详细卡牌规则'],scienceTitle:['모형으로 이해하는 양자','Learning with a quantum model','量子をモデルで学ぶ','用模型理解量子'],notOrbit:['궤도 그림은 상징적 표현입니다. 게임판의 준위 간격도 실제 원자와 다릅니다.','Orbit art is symbolic. Board level spacing is not to physical scale.','軌道図は記号的です。準位間隔も実際とは異なります。','轨道图为示意，能级间距不按真实比例。'],inviteHelp:['초대 링크를 공유하고, 모두 준비되면 시작하세요.','Share the invite. Start when everyone is ready.','招待リンクを共有し、全員準備ができたら開始。','分享邀请，所有人准备后即可开始。'],emptySeat:['참가자 기다리는 중','Waiting for a player','参加者を待っています','等待玩家'],joinHelp:['친구에게 받은 6자리 방 코드를 입력하세요.','Enter the six-character code from your friend.','友達からの6桁コードを入力。','输入朋友提供的六位房间代码。'],codeError:['방 코드는 영문·숫자 6자리입니다.','Use six letters or numbers.','英数字6桁で入力。','请输入六位字母或数字。'],saved:['설정이 저장됩니다.','Preferences are saved on this device.','設定はこの端末に保存。','设置保存在此设备。'],endJourney:['수집 결과','Collection result','収集結果','收集结果'],score:['스펙트럼','Spectral lines','スペクトル','谱线'],stalled:['방장은 60초 이상 지연된 차례를 넘길 수 있습니다.','The host can skip a turn stalled for 60 seconds.','ホストは60秒以上遅延したターンをスキップできます。','房主可跳过超过60秒的回合。'],networkPolling:['온라인 동기화','Online sync','オンライン同期','在线同步'],musicUnsupported:['이 브라우저에서 오디오를 시작할 수 없습니다.','Audio is unavailable in this browser.','このブラウザで音声を開始できません。','此浏览器无法播放音频。'],lose:['이번 빛의 여정이 끝났어요','This light journey is complete','光の旅が終わりました','本次光之旅结束'],totalHistory:['최근 30개의 완료된 게임을 이 기기에 보관합니다.','The last 30 completed games are saved on this device.','直近30ゲームを端末に保存。','此设备保存最近30场已完成游戏。'],back:['돌아가기','Back','戻る','返回'],previewLevel:['이동 가능한 준위','Reachable levels','移動可能な準位','可到达能级'],spectrumHint:['아래 빛을 누르면 목표 전이를 확인할 수 있어요.','Tap a light below to inspect its target transition.','下の光をタップして目標遷移を確認。','点击下方谱线查看目标跃迁。']
});
Object.assign(rows,{
 turnTime:['차례 제한 시간','Turn time','ターン制限時間','回合限时'],
 turnRule:['한 차례는 10초입니다. 카드 뽑기·다시 뽑기·효과 선택을 모두 마쳐야 합니다. 시간이 끝나면 손의 카드를 버리고 다음 차례로 넘어갑니다.','Each turn lasts 10 seconds, including drawing, redrawing and choosing an effect. On timeout, discard your hand and advance to the next turn.','1ターンは10秒。引く・引き直す・効果の選択をすべて終えてください。時間切れで手札を捨てて次のターンへ進みます。','每回合10秒，包含抽牌、重抽和选择效果。超时后弃掉手牌并进入下一回合。'],
 turnExpired:['10초가 지나 차례가 자동으로 넘어갔습니다.','Time expired. Your turn was passed automatically.','10秒が経過し、次のターンへ進みました。','10秒已到，已自动进入下一回合。'],
 timeoutLog:['시간 초과 · 자동 차례 종료','timed out · turn passed','時間切れ・自動ターン終了','超时 · 自动结束回合'],
 timeRemaining:['남은 시간','Time remaining','残り時間','剩余时间'],
 gameTime:['게임 남은 시간','Game time left','ゲーム残り時間','游戏剩余时间'],
 syncingTurn:['다음 차례 확인 중','Updating the next turn','次のターンを確認中','正在更新下一回合'],
 seconds:['초','s','秒','秒']
});
Object.assign(rows,{
 playersUnit:['명','players','人','人'], cardsUnit:['장','cards','枚','张'], linesUnit:['종의 선','lines','種類の線','种谱线'],
 auditionTitle:['스펙트럼 연주','Play the spectrum','スペクトルを奏でる','演奏光谱'],
 auditionHint:['선을 눌러 게임 속 색과 소리를 체험하세요.','Tap a line to try its game color and tone.','線を押してゲームの色と音を体験。','点击谱线，体验游戏的色彩与音色。'],
 recordedLines:['이번 판에 기록한 스펙트럼','Spectrum recorded this game','このゲームで記録したスペクトル','本局记录的光谱'],
 noLinesYet:['기록한 선이 없습니다.','No lines recorded.','記録した線はありません。','尚未记录谱线。'],
 lastCard:['직전 카드','Last card','直前のカード','上一张牌'],
 participants:['참가자','Players','参加者','玩家'],
 turnShort:['카드 뽑기부터 효과 선택까지 한 차례에 10초','10 seconds to draw and resolve your card.','引いて効果を選ぶまで、1ターン10秒。','从抽牌到选定效果共10秒。'],
 awaitSignal:['첫 카드 사용 대기','Awaiting first card play','最初のカードの使用待ち','等待首次出牌'],
 detector:['관측 신호','Detector signal','観測信号','观测信号'],
 musicDesc:['대기실의 건반, 대전의 리듬, 결과 화면의 잔잔한 마무리','Keys in the lobby, pulse in play, a quiet coda at the finish','ロビーは鍵盤、対戦はビート、結果は穏やかな終奏。','大厅的琴声、对局的律动与结算的尾奏。'],
 sfxDesc:['카드 넘기는 소리, 전이 방향, 여섯 선의 고유 음색','Card foley, transition direction and six signature chimes','カードをめくる音、遷移の方向、六つの線の音色。','翻牌、跃迁方向与六条谱线的专属音色。']
});

Object.assign(rows, {
  "guideArtHint": ["그림을 누르면 확대됩니다.","Tap the artwork to enlarge.","絵を押すと拡大します。","点击牌面可放大。"],
  "guideJump": [
    "카드 종류",
    "Card family",
    "カードの種類",
    "牌的种类"
  ],
  "guideEnergyIndex": [
    "숫자 카드 전체",
    "All number cards",
    "数値カード一覧",
    "全部数字牌"
  ],
  "guideEnergy": [
    "에너지 카드",
    "Energy card",
    "エネルギーカード",
    "能量牌"
  ],
  "guideSpecial": [
    "특수 카드",
    "Special card",
    "特殊カード",
    "特殊牌"
  ],
  "guideCopies": [
    "덱 구성",
    "In the deck",
    "デッキ内",
    "牌组内"
  ],
  "guideFamilyCopies": [
    "이 계열 총 24장",
    "24 in this family",
    "同系統は計24枚",
    "同类共24张"
  ],
  "guideTransitions": [
    "이 숫자로 가능한 전이 · 게임 단위 EU",
    "Allowed transitions · game units (EU)",
    "この数値で可能な遷移 · ゲーム単位 EU",
    "此数值允许的跃迁 · 游戏单位 EU"
  ],
  "guideExample": [
    "플레이 예시",
    "In play",
    "プレイ例",
    "出牌示例"
  ],
  "guidePrev": [
    "이전 카드",
    "Previous",
    "前のカード",
    "上一张"
  ],
  "guideNext": [
    "다음 카드",
    "Next",
    "次のカード",
    "下一张"
  ],
  "guideZoom": [
    "카드 크게 보기",
    "Enlarge card",
    "カードを拡大",
    "放大卡牌"
  ],
  "guideShrink": [
    "원래 크기로",
    "Close enlargement",
    "元の大きさに戻す",
    "返回原尺寸"
  ],
  "guideAbsorbRule": [
    "현재 에너지에 카드의 숫자를 더하세요. 합이 다른 준위와 정확히 일치하면 그곳으로 올라갑니다. 흡수로는 빛 토큰을 얻지 않습니다.",
    "Add the card value to your energy. You rise only if the sum exactly matches another level. Absorption gives no light token.",
    "現在のエネルギーにカードの数値を足します。和が別の準位と一致すると上昇します。吸収では光トークンを得ません。",
    "将牌面数值加到当前能量上。和恰好等于另一个能级时才能上升。吸收不会获得光标记。"
  ],
  "guideEmitRule": [
    "카드의 숫자만큼 낮은 준위가 있으면 그곳으로 내려가며 빛을 방출합니다. 목표 전이라면 재고가 있는 미수집 토큰 하나를 얻습니다.",
    "Subtract the indicated amount. An exact landing on a lower level emits light. A target transition earns its line if you do not own it and a token is available.",
    "表示量を引いて下の準位に一致すれば光を放出します。目標遷移で、未所持かつ在庫のある線を獲得できます。",
    "减去标示的能量。若恰好落到较低能级，就会发光。如果是目标跃迁、你尚未拥有该谱线且还有库存，即可收集。"
  ],
  "guideUpRule": [
    "현재보다 높은 준위 중 하나를 직접 고릅니다. 맨 위 준위에서는 사용할 수 없습니다.",
    "Choose any higher level. This card is unavailable at the top level.",
    "現在より高い準位を一つ選びます。最高準位では使えません。",
    "任选一个较高能级。在最高能级时无法使用。"
  ],
  "guideUpExample": [
    "0 EU에서 17 EU로 올라가면 다음 차례에 −4로 13 EU에 도착해 Hα를 노릴 수 있습니다.",
    "Rise from 0 to 17 EU to set up a later −4 move to 13 EU for Hα.",
    "0から17 EUへ上がれば、次のターン以降に−4で13 EUに移り、Hαを狙えます。",
    "从0升至17 EU，之后有机会用−4降到13 EU，收集Hα。"
  ],
  "guideDownRule": [
    "현재보다 낮은 준위를 직접 고릅니다. 목표선이 있는 전이를 고르면 수집할 기회가 생깁니다. 맨 아래에서는 사용할 수 없습니다.",
    "Choose any lower level. A target transition can earn a line. The card is unavailable at the bottom level.",
    "現在より低い準位を選びます。目標遷移なら線を獲得できます。最低準位では使えません。",
    "任选一个较低能级。目标跃迁可能获得谱线。在最低能级时无法使用。"
  ],
  "guideDownExample": [
    "20 EU에서 13 EU로 내리면 Hδ(410 nm), 17 EU로 내리면 IR(1094 nm) 전이입니다.",
    "From 20 EU, landing at 13 EU gives the Hδ transition (410 nm), and 17 EU gives IR (1094 nm).",
    "20 EUから13 EUへはHδ（410 nm）、17 EUへはIR（1094 nm）です。",
    "从20 EU降到13 EU是Hδ（410 nm），降到17 EU是IR（1094 nm）。"
  ],
  "guideWildRule": [
    "전자의 에너지를 그대로 두고 다른 원자에서 관측한 빛을 기록합니다. 남은 토큰 중 아직 내게 없는 선 하나를 고릅니다.",
    "Keep your energy and record light from another atom. Choose one line you lack with a token left in stock.",
    "エネルギーはそのままに、別の原子からの光を記録します。在庫のある未所持の線を一つ選びます。",
    "保持能量不变，记录来自另一个原子的光。从仍有库存且未拥有的谱线中选一条。"
  ],
  "guideWildExample": [
    "Hα와 IR만 모았다면 남은 네 종류 중 재고가 있는 선을 고를 수 있습니다.",
    "With only Hα and IR collected, choose any available token among the other four lines.",
    "HαとIRだけを持っていれば、他の4種のうち在庫のある線を選べます。",
    "若只有Hα和IR，可从其他四种有库存的谱线中选择。"
  ],
  "guideRedrawRule": [
    "처음 두 장을 뽑는 중 이 카드가 나오면 버리고 손을 두 장까지 채웁니다. 이번 차례에 한 번, 손의 카드 한 장을 새 카드로 바꿀 수 있습니다.",
    "If drawn in the opening pair, discard it and keep dealing until you have two cards. Once this turn, you may exchange one card.",
    "最初の2枚を引く途中で出たら捨て、手札が2枚になるまで補充します。そのターンに一度、手札1枚を交換できます。",
    "抽起始两张时若抽到此牌，弃掉并继续补到两张。本回合可以换一次手中的一张牌。"
  ],
  "guideRedrawExample": [
    "교환할 때 또 다시뽑기 카드가 나오면 그 카드도 버립니다. 추가 교환은 없고 남은 시간 안에 선택합니다.",
    "If the replacement is also a redraw, discard it. There is no second exchange, and the same turn clock continues.",
    "交換先も引き直しならそのカードも捨てます。再交換はなく、同じ制限時間内に選びます。",
    "若换来的仍是重抽牌，也要弃掉。不能再次换牌，回合计时继续。"
  ],
  "guideStealRule": [
    "다른 참가자의 수집함에서 아직 내가 갖지 않은 선 하나를 내 수집함으로 옮깁니다. 가져올 수 있는 선이 있어야 사용합니다.",
    "Move one line from another player’s collection into yours. Choose a line you do not already own.",
    "他の参加者の記録から自分が持っていない線を一つ選び、自分の記録に移します。",
    "从另一名玩家的收藏里，将你尚未拥有的一条谱线移入自己的收藏。"
  ],
  "guideStealExample": [
    "상대에게 Hβ가 있고 내 수집함에 없다면 Hβ 토큰 한 개를 가져옵니다. 두 사람의 에너지는 그대로입니다.",
    "If another player has Hβ and you do not, take that token. Both energy levels stay the same.",
    "相手だけがHβを持つとき、そのトークンを獲得できます。両者のエネルギーは変わりません。",
    "如果对方有Hβ而你没有，就能拿走那枚标记。双方能量保持不变。"
  ],
  "guideBreakRule": [
    "상대가 가진 빛 토큰 하나를 골라 빛 버림 더미로 보냅니다. 그 토큰은 이번 판의 수집함과 공급처에서 빠집니다.",
    "Choose one token another player owns and send it to the light discard pile. That token leaves circulation for this game.",
    "相手の光トークンを一つ選び、光の捨て山へ送ります。そのトークンはこのゲームの供給から外れます。",
    "选一枚对方拥有的光标记放入光弃置区。该标记本局退出流通。"
  ],
  "guideBreakExample": [
    "상대의 IR을 제거하면 상대의 수집 수가 하나 줄어듭니다. 내 수집 수와 전자의 에너지는 그대로입니다.",
    "Removing an opponent’s IR lowers their count by one. Your collection and the energy levels stay the same.",
    "相手のIRを除去すれば相手の記録数は一つ減ります。自分の記録数とエネルギーは変わりません。",
    "移除对方的IR会令其收藏数减一。自己的收藏数和电子能量不变。"
  ],
  "visualGroup": [
    "화면 연출",
    "Visual effects",
    "画面演出",
    "画面效果"
  ],
  "audioGroup": [
    "소리",
    "Audio",
    "サウンド",
    "音频"
  ],
  "readGroup": [
    "읽기",
    "Reading",
    "読みやすさ",
    "阅读"
  ],
  "motionMaster": [
    "전체 애니메이션",
    "All animations",
    "すべてのアニメーション",
    "全部动画"
  ],
  "motionDetail": [
    "아래에서 고른 연출을 한 번에 켜거나 끕니다.",
    "Turn your selected effects on or off together.",
    "選んだ演出をまとめて切り替えます。",
    "统一开关下方已选的效果。"
  ],
  "ambient": [
    "배경 빛결",
    "Moving light waves",
    "背景の光の波",
    "背景光波"
  ],
  "ambientDesc": [
    "관측소와 게임판 위를 흐르는 빛의 물결",
    "Drifting ribbons of light in the observatory and arena",
    "観測所と盤面を流れる光の波",
    "流过观测站和牌桌的光带"
  ],
  "gameFx": [
    "플레이 효과",
    "Play effects",
    "プレイ演出",
    "对局特效"
  ],
  "gameFxDesc": [
    "카드 뒤집기와 광택, 전이 궤적, 수집 연출",
    "Card reveals and foil, transition trails, and collecting light",
    "カードの反転ときらめき、遷移と収集の光",
    "翻牌、闪光、跃迁轨迹与收集光效"
  ],
  "touchFx": [
    "터치·클릭 효과",
    "Touch and click effects",
    "タッチ・クリック演出",
    "触摸与点击特效"
  ],
  "touchFxDesc": [
    "누른 자리에 퍼지는 회절 고리와 별빛",
    "Diffraction rings and starlight at the point of contact",
    "押した位置に広がる光の輪ときらめき",
    "从接触位置扩散的光环与星芒"
  ],
  "guideHint": [
    "카드 앞면과 사용법을 함께 봅니다.",
    "Explore card faces alongside their rules.",
    "カードの表面と使い方を一緒に確認。",
    "对照牌面查看用法。"
  ]
});
