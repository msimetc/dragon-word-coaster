const SHEETS = {
  CLASSES: '수업', QUESTIONS: '문제', RESULTS: '결과', SESSIONS: '세션', SETTINGS: '설정', RANKING: '랭킹'
};
const HEADERS = {
  '수업': ['수업코드','수업명','학년반','문제세트','출제수','출제순서','공개상태','시작일시','종료일시','생성일'],
  '문제': ['문제ID','문제세트','문제유형','문제','정답','오답1','오답2','오답3','중국어','병음','한국어뜻','해설','음성텍스트','활성화','검증상태'],
  '결과': ['결과ID','제출시각','수업코드','학생이름','캐릭터ID','완주시간(ms)','정답수','문제수','정답률','최고콤보','세션ID'],
  '세션': ['세션ID','수업코드','학생이름','캐릭터ID','문제ID목록','시작시각','종료시각','상태'],
  '설정': ['설정','값']
};
const ALLOWED_TYPES = ['단어뜻','중국어선택','병음선택','문장뜻','빈칸','듣기'];

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🐉 청룡열차 관리')
    .addItem('초기 시트 만들기', 'setupWorkbook')
    .addItem('샘플 문제 생성', 'createSampleData')
    .addSeparator()
    .addItem('전체 문제 검증', 'validateAllQuestions')
    .addItem('수업 코드 생성', 'generateCodeForActiveRow')
    .addItem('선택한 수업 공개/비공개', 'toggleClassPublication')
    .addSeparator()
    .addItem('학생용 게임 열기', 'openStudentGame')
    .addItem('설치 상태 확인', 'showInstallStatus')
    .addToUi();
}

function setupWorkbook() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const headers = HEADERS[name];
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#0d6775').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headers.length);
  });
  const settings = ss.getSheetByName(SHEETS.SETTINGS);
  if (settings.getLastRow() < 2) settings.getRange(2,1,6,2).setValues([
    ['게임URL','https://YOUR_GITHUB_NAME.github.io/YOUR_REPOSITORY/'],['기본출제수','10'],['랭킹표시수','10'],['이름최대길이','12'],['최소완주시간초','15'],['최대완주시간분','30']
  ]);
  ensureRankingView(ss);
  SpreadsheetApp.getUi().alert('청룡열차 관리 시트가 준비되었습니다.');
}

// 랭킹 시트: B1에 수업코드를 입력하면 정답 수 내림차순, 같으면 완주 시간 오름차순으로 정렬됩니다.
function ensureRankingView(ss) {
  let sh = ss.getSheetByName(SHEETS.RANKING);
  if (!sh) sh = ss.insertSheet(SHEETS.RANKING);
  sh.getRange('A1').setValue('수업코드').setFontWeight('bold');
  sh.getRange('B1').setValue('DEMO01').setBackground('#fff2cc').setFontWeight('bold');
  sh.getRange('A2').setValue('B1에 수업코드를 입력하면 정답 수가 많은 순, 같으면 완주 시간이 짧은 순으로 정렬됩니다. (결과 시트는 자동으로 갱신됩니다)');
  sh.getRange('A4:F4').setValues([['순위', '학생이름', '정답수', '문제수', '완주시간(초)', '제출시각']])
    .setFontWeight('bold').setBackground('#0d6775').setFontColor('#ffffff');
  sh.getRange('A5').setFormula('=ARRAYFORMULA(IF(B5:B="","",ROW(B5:B)-4))');
  sh.getRange('B5').setFormula(
    "=IFERROR(SORT(FILTER({'결과'!D2:D,'결과'!G2:G,'결과'!H2:H,'결과'!F2:F/1000,'결과'!B2:B},'결과'!C2:C=$B$1,'결과'!A2:A<>\"\"),2,FALSE,4,TRUE),\"\")"
  );
  sh.getRange('E5:E1000').setNumberFormat('0.0');
  sh.getRange('F5:F1000').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setFrozenRows(4);
  sh.autoResizeColumns(1, 6);
}

function createSampleData() {
  setupWorkbook();
  const q = SpreadsheetApp.getActive().getSheetByName(SHEETS.QUESTIONS);
  if (q.getLastRow() > 1) {
    const answer = SpreadsheetApp.getUi().alert('기존 문제 아래에 샘플을 추가할까요?', SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (answer !== SpreadsheetApp.getUi().Button.YES) return;
  }
  const rows = [
    ['Q001','HSK1-01','단어뜻','苹果의 뜻은?','사과','포도','수박','바나나','苹果','píngguǒ','사과','과일 이름','苹果',true,''],
    ['Q002','HSK1-01','중국어선택','‘학교’에 해당하는 단어는?','学校','老师','学生','朋友','学校','xuéxiào','학교','장소 단어','学校',true,''],
    ['Q003','HSK1-01','병음선택','朋友의 올바른 병음은?','péngyou','píngguǒ','xuéxiào','lǎoshī','朋友','péngyou','친구','병음 확인','朋友',true,''],
    ['Q004','HSK1-01','문장뜻','我喜欢学习中文。의 뜻은?','나는 중국어 공부를 좋아한다','나는 학교에 간다','나는 밥을 먹는다','나는 친구를 만난다','我喜欢学习中文。','wǒ xǐhuan xuéxí Zhōngwén','나는 중국어 공부를 좋아한다','문장 해석','我喜欢学习中文。',true,''],
    ['Q005','HSK1-01','빈칸','我___学生。빈칸에 알맞은 말은?','是','有','去','吃','我是学生。','wǒ shì xuésheng','나는 학생이다','是는 ~이다','我是学生。',true,'']
  ];
  q.getRange(q.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
  validateAllQuestions();
  const classes = SpreadsheetApp.getActive().getSheetByName(SHEETS.CLASSES);
  if (classes.getLastRow() < 2) classes.appendRow(['DRGN01','1과 단어 복습','체험반','HSK1-01',5,'무작위','공개','', '', new Date()]);
}

function validateAllQuestions() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.QUESTIONS);
  if (!sh || sh.getLastRow() < 2) return SpreadsheetApp.getUi().alert('검증할 문제가 없습니다.');
  const values = sh.getRange(2,1,sh.getLastRow()-1,HEADERS[SHEETS.QUESTIONS].length).getValues();
  let errors = 0;
  values.forEach((r,i) => {
    const problems=[]; const choices=[r[4],r[5],r[6],r[7]].map(String).map(x=>x.trim()).filter(Boolean);
    if (!String(r[0]).trim()) problems.push('문제ID가 비어 있습니다.');
    if (!String(r[1]).trim()) problems.push('문제세트가 비어 있습니다.');
    if (!ALLOWED_TYPES.includes(String(r[2]).trim())) problems.push('지원하지 않는 문제유형입니다.');
    if (!String(r[3]).trim()) problems.push('문제가 비어 있습니다.');
    if (!String(r[4]).trim()) problems.push('정답이 비어 있습니다.');
    if (!String(r[5]).trim()) problems.push('오답1이 비어 있습니다.');
    if (new Set(choices).size !== choices.length) problems.push('정답 또는 선택지가 중복됩니다.');
    if (String(r[3]).length > 300) problems.push('문제가 너무 깁니다.');
    r[14]=problems.length ? problems.join(' ') : '정상';
    const rowRange=sh.getRange(i+2,1,1,r.length); rowRange.setBackground(problems.length?'#fce8e6':'#e6f4ea');
    sh.getRange(i+2,15).setNote(problems.join('\n')); if(problems.length) errors++;
  });
  sh.getRange(2,1,values.length,values[0].length).setValues(values);
  SpreadsheetApp.getUi().alert(errors ? `${errors}개 행에서 오류를 찾았습니다.` : '모든 문제가 정상입니다.');
}

function generateCodeForActiveRow() {
  const sh=SpreadsheetApp.getActiveSheet(); if(sh.getName()!==SHEETS.CLASSES) return SpreadsheetApp.getUi().alert('수업 시트에서 실행해주세요.');
  const row=sh.getActiveRange().getRow(); if(row<2)return; sh.getRange(row,1).setValue(uniqueClassCode());
}
function uniqueClassCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.CLASSES),existing=sh.getLastRow()>1?new Set(sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat()):new Set();let code;do{code=Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join('')}while(existing.has(code));return code}
function toggleClassPublication(){const sh=SpreadsheetApp.getActiveSheet();if(sh.getName()!==SHEETS.CLASSES)return SpreadsheetApp.getUi().alert('수업 시트에서 실행해주세요.');const row=sh.getActiveRange().getRow();if(row<2)return;const cell=sh.getRange(row,7),next=cell.getValue()==='공개'?'비공개':'공개';cell.setValue(next);SpreadsheetApp.getUi().alert(`수업을 ${next} 상태로 변경했습니다.`)}
function openStudentGame(){const url=getSetting('게임URL');SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(`<p><a href="${safeHtml(url)}" target="_blank">학생용 게임 열기</a></p>`).setWidth(320).setHeight(100),'청룡열차')}
function showInstallStatus(){SpreadsheetApp.getUi().alert(`스프레드시트 ID: ${SpreadsheetApp.getActive().getId()}\n웹 앱은 배포 > 새 배포 > 웹 앱에서 배포하세요.`)}

function doGet(e){return jsonResponse(route(String(e.parameter.action||''),e.parameter||{}))}
function doPost(e){try{const body=JSON.parse(e.postData.contents||'{}');return jsonResponse(route(String(body.action||''),body))}catch(err){return jsonResponse(fail('INVALID_JSON','요청 형식이 올바르지 않습니다.'))}}
function route(action,p){try{switch(action){case'getClass':return getClassApi(p);case'getRanking':return getRankingApi(p);case'startSession':return startSessionApi(p);case'checkAnswer':return checkAnswerApi(p);case'submitResult':return submitResultApi(p);default:return fail('UNKNOWN_ACTION','지원하지 않는 요청입니다.')}}catch(err){console.error(err);return fail('SERVER_ERROR','요청을 처리하지 못했습니다.')}}

function getClassApi(p){const row=findClass(cleanCode(p.code));if(!row)return fail('CLASS_NOT_FOUND','수업 코드를 찾을 수 없거나 공개되지 않은 수업입니다.');return ok({code:row[0],title:row[1],grade:row[2],questionCount:Number(row[4])||10})}
function startSessionApi(p){const code=cleanCode(p.classCode),name=clean(p.studentName,12),character=clean(p.characterId,30),classRow=findClass(code);if(!classRow)return fail('CLASS_NOT_FOUND','참여할 수 없는 수업입니다.');if(!name)return fail('NAME_REQUIRED','이름 또는 별명을 입력해주세요.');const questions=getQuestions(classRow[3],Number(classRow[4])||10,classRow[5]);if(!questions.length)return fail('NO_QUESTIONS','공개된 문제가 없습니다.');const sessionId=Utilities.getUuid(),ids=questions.map(q=>q.id);withLock(()=>SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS).appendRow([sessionId,code,name,character,JSON.stringify(ids),new Date(),'','진행중']));return ok({sessionId,questions:questions.map(q=>({id:q.id,type:q.type,question:q.question,text:q.text,pinyin:q.pinyin,choices:q.choices,explanation:q.explanation}))})}
function checkAnswerApi(p){const sessionId=clean(p.sessionId,80),questionId=clean(p.questionId,80),choiceIndex=Number(p.choiceIndex),sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS),data=sh.getDataRange().getValues(),session=data.find((r,i)=>i>0&&r[0]===sessionId&&r[7]==='진행중');if(!session)return fail('SESSION_NOT_FOUND','진행 중인 게임 세션을 찾을 수 없습니다.');const ids=JSON.parse(session[4]);if(!ids.includes(questionId))return fail('QUESTION_NOT_ASSIGNED','이 세션에 배정되지 않은 문제입니다.');const q=getQuestionMap([questionId])[questionId];if(!q)return fail('QUESTION_NOT_FOUND','문제를 찾을 수 없습니다.');const correctIndex=q.choices.indexOf(q.answer);return ok({correct:choiceIndex===correctIndex,correctIndex:correctIndex,explanation:q.explanation})}
function submitResultApi(p){const sessionId=clean(p.sessionId,80),answers=Array.isArray(p.answers)?p.answers:[];return withLock(()=>{const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SESSIONS),data=sh.getDataRange().getValues(),idx=data.findIndex((r,i)=>i>0&&r[0]===sessionId);if(idx<0)return fail('SESSION_NOT_FOUND','게임 세션을 찾을 수 없습니다.');const s=data[idx];if(s[7]!=='진행중')return fail('ALREADY_SUBMITTED','이미 제출한 기록입니다.');const ids=JSON.parse(s[4]),questionMap=getQuestionMap(ids),answerMap=new Map(answers.map(a=>[String(a.questionId),Number(a.choiceIndex)]));let correct=0,combo=0,best=0;ids.forEach(id=>{const q=questionMap[id],choice=q&&q.choices[answerMap.get(id)];if(q&&choice===q.answer){correct++;combo++;best=Math.max(best,combo)}else combo=0});const now=new Date(),elapsed=Math.max(0,now-new Date(s[5])),accuracy=Math.round(correct/ids.length*100),resultId=Utilities.getUuid();sh.getRange(idx+1,7,1,2).setValues([[now,'완료']]);SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS).appendRow([resultId,now,s[1],s[2],s[3],elapsed,correct,ids.length,accuracy,best,sessionId]);return ok({resultId,timeMs:elapsed,correct,total:ids.length,accuracy,bestCombo:best})})}
function getRankingApi(p){const code=cleanCode(p.code),limit=Math.min(50,Number(getSetting('랭킹표시수'))||10),sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.RESULTS);if(sh.getLastRow()<2)return ok({rankings:[]});const rows=sh.getRange(2,1,sh.getLastRow()-1,11).getValues().filter(r=>r[2]===code).map(r=>({id:r[0],createdAt:new Date(r[1]).toISOString(),name:r[3],characterId:r[4],character:characterEmoji(r[4]),timeMs:Number(r[5]),correct:Number(r[6]),total:Number(r[7]),accuracy:Number(r[8]),bestCombo:Number(r[9])})).sort((a,b)=>b.correct-a.correct||a.timeMs-b.timeMs||a.createdAt.localeCompare(b.createdAt)).slice(0,limit);return ok({rankings:rows})}

function findClass(code){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.CLASSES);if(!sh||sh.getLastRow()<2)return null;const now=new Date();return sh.getRange(2,1,sh.getLastRow()-1,10).getValues().find(r=>r[0]===code&&r[6]==='공개'&&(!r[7]||new Date(r[7])<=now)&&(!r[8]||new Date(r[8])>=now))||null}
function getQuestions(setId,count,order){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.QUESTIONS);if(!sh||sh.getLastRow()<2)return[];let rows=sh.getRange(2,1,sh.getLastRow()-1,15).getValues().filter(r=>r[1]===setId&&r[13]!==false&&r[14]==='정상');if(order==='무작위')rows=rows.sort(()=>Math.random()-.5);return rows.slice(0,count).map(rowToQuestion)}
function getQuestionMap(ids){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.QUESTIONS),map={};if(sh.getLastRow()<2)return map;sh.getRange(2,1,sh.getLastRow()-1,15).getValues().forEach(r=>{if(ids.includes(String(r[0])))map[String(r[0])]=rowToQuestion(r)});return map}
function rowToQuestion(r){const id=String(r[0]),choices=deterministicShuffle([r[4],r[5],r[6],r[7]].filter(v=>String(v).trim()).map(String),id),answer=String(r[4]);return{id:id,type:String(r[2]),question:String(r[3]),answer,text:String(r[8]||r[4]),pinyin:String(r[9]||''),choices:choices,explanation:String(r[11]||'')}}
function deterministicShuffle(values,seedText){let seed=0;for(let i=0;i<seedText.length;i++)seed=(seed*31+seedText.charCodeAt(i))>>>0;const out=values.slice();for(let i=out.length-1;i>0;i--){seed=(seed*1664525+1013904223)>>>0;const j=seed%(i+1);[out[i],out[j]]=[out[j],out[i]]}return out}
function getSetting(key){const sh=SpreadsheetApp.getActive().getSheetByName(SHEETS.SETTINGS);if(!sh||sh.getLastRow()<2)return'';const row=sh.getRange(2,1,sh.getLastRow()-1,2).getValues().find(r=>r[0]===key);return row?row[1]:''}
function withLock(fn){const lock=LockService.getScriptLock();lock.waitLock(10000);try{return fn()}finally{lock.releaseLock()}}
function clean(v,max){return String(v||'').replace(/[<>]/g,'').trim().slice(0,max||100)}function cleanCode(v){return clean(v,6).toUpperCase()}function safeHtml(v){return String(v||'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]))}
function ok(data){return{success:true,data:data,error:null}}function fail(code,message){return{success:false,data:null,error:{code:code,message:message}}}function jsonResponse(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON)}
function characterEmoji(id){return({panda:'🐼',fox:'🦊',rabbit:'🐰',tiger:'🐯',cat:'🐱',monkey:'🐵',dog:'🐶',dragon:'🐲'})[id]||'🐲'}
