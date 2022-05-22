/**
 * bin/wscmd: copyright (c) 2022 websocket command, designed by ilshookim
 * 1 들여쓰기: 스페이스 2 고정, UTF8 NoBOM, 라인 주석은 23 또는 53 컬럼에서 남김
 * 2 문자포맷: 백틱을 사용 `${expr}`
 * 3 정의방식: 상수 const, 변수 let, 항상 세미콜론을 사용 (예외처리 try-catch, 함수 정의에서 제외)
 * 4 작성순서: 포함, 환경, 함수, 상수, 스펙, 모듈, 프로그램 정의, 함수 정의 순으로 작성
 */

`use strict`;

/*
  웹소켓 서버에 접속하고 커맨드 입출력 기능을 제공하는 websocket command

  1. WS/WSS URL 멀티접속 지원
  2. 프롬프트 입출력과 자동완성 지원
  3. 커맨드와 히스토리 파일을 지원
*/

// 포함
const Fs = require(`fs`);
const Ws = require(`ws`);
const Path = require(`path`);
const Yaml = require(`js-yaml`);
const Yargs = require(`yargs`);
const Readline = require(`readline`);
const [Parser, Prompt] = [Yargs, Readline];

// 환경
const configure = {
  // 경로 구분
  path: `bin`,
  // 실행파일 이름
  execute: `wscmd`,
  // 버전
  version: `1.0.0`,
  // 작성자
  written: `written by ilshookim`,
  // 저작권
  copyright: `copyright (c) 2022 websocket command`,
  // 패키지를 구분
  pkg: process.pkg ? true : false,
  // 노드 런타임을 구분
  node: equals(require.main, module),
  // 실행 경로
  pwdPath: process.env.PWD ? process.env.PWD : process.cwd(),
};

// 함수
const functions = {
  // 키입력을 시작
  keys: letsKeys,
  // 프롬프트를 시작
  prompts: letsPrompts,
  // 전체 서버에 연결을 시작
  connections: letsConnections,
  // 페이로드를 연결로 보냄
  send: send,
  // 터미널에 출력하고 프롬프트를 표시
  output: output,
  // 온라인 상태의 연결수를 확인
  online: online,
  // 프로그램을 종료
  exit: exit,
  // 웹소켓으로 연결
  websocket: websocket,
  // 문자열에서 와일드카드 *(별표)를 이용하여 검색
  search: search,
  // ' 또는 " 로 감싸진 문자열을 모두 벗겨냄
  disclosureQuotes: disclosureQuotes,
  // 0 인지 확인
  zero: zero,
  // 비었는지 확인
  empty: empty,
  // 항목수를 확인
  items: items,
  // 같은지 비교
  equals: equals,
};

// 상수
const constants = {
  // 모듈 경로: bin/wscmd
  name: `${Path.join(configure.path, Path.basename(module.filename))}`,
  // 환영 메시지
  welcome: `${configure.execute} ${configure.version} - ${configure.copyright}, ${configure.written}\n`,
  // 전체화면을 지운후에 환영 메시지
  simpleWelcome: `${configure.execute} ${configure.version} - ${configure.copyright}\n`,
  // 예약어 목록
  reserves: `cmd get set del history clear exit exit! help`,
  // 안녕 메시지
  goodbye: `Goodbye`,
  // 커맨드 파일명
  commandFile: `command`,
  // 히스토리 파일명
  historyFile: `history`,
  // 히스토리 최대수
  maxHistorySize: 100,
  // 히스토리 표시 기본값
  showHistorySize: 20,
  // 최대 프롬프트 제한수
  maxPromptLimit: 262144,
  // 한줄띄움
  newline: ``,
  // 프롬프트 형식
  prompt: `$ `,
};

// 모듈 스펙
// - 환경, 상수과 스펙을 외부에서 사용
// - 함수를 외부에서 사용
const spec = module.exports = {
  configure: configure,
  ...constants,
  ...functions,
  init: init,
  run: run,
};

//
// 도움말 상수
//

const kUsageNpm =
  `  usage: $ npm run ${spec.configure.execute} -- [options] wss://localhost:9511/topics\n` +
  `         $ node bin/${spec.configure.execute} [options] ws://localhost:9510/topics wss://localhost:9511/topics\n\n`;

const kUsagePkg =
  `  usage: $ ./${spec.configure.execute} [options] wss://localhost:9511/topics\n` +
  `         $ ./${spec.configure.execute} [options] ws://localhost:9510/topics wss://localhost:9511/topics\n\n`;

const kOptions =
  `  options: --cmd=command --history=history   - change command and history filename\n` +
  `           --prj=project-name                - change at once command and history filename by project name\n\n`;

const kKeys =
  `  > <esc>                                    - clear prompt\n` +
  `  > <tab>                                    - make auto-completion commands\n` +
  `  > <tab><tab>                               - show auto-completion commands/reserves\n\n`;

const kUsage =
  `${spec.configure.pkg ? kUsagePkg : kUsageNpm}` +
  `${kOptions}` +
  `${kKeys}` +
  `  > [name, …]                                - /quick/ run commands by name\n` +
  `    get [name, wildcard, …]                  - /quick/ get line which merged payloads by commands\n` +
  `    set [name=payload, name, payload, …]     - /quick/ set commands by name\n` +
  `    del [name, wildcard, …]                  - /quick/ delete commands by name\n` + `\n` +
  `  > cmd                                      - show commands\n` +
  `    cmd [name, payload, …]                   - run commands by name, payload\n` +
  `    cmd get [name, wildcard, …]              - get line which merged payloads by commands\n` +
  `    cmd set [name=payload, name, payload, …] - set commands by delimiter\n` +
  `    cmd del [name, wildcard, …]              - delete commands by name\n` + `\n` +
  `  > url | ll | ls                            - show online states and urls\n` + `\n` +
  `  > history [count]                          - show history until count (default=${spec.showHistorySize})\n` +
  `    history all                              - show history (max=${spec.maxHistorySize})\n` +
  `    history del [wildcard]                   - delete history by wildcard\n` + `\n` +
  `  > clear                                    - clear screen\n` +
  `    exit!                                    - program exit without any saving\n` +
  `    exit                                     - program exit with saving\n`;

const kHelp =
  `\n${kUsage}`;

//
// 웹소켓 CLI 구현
//

// 플래그를 정의
// - 프롬프트가 교체중인지: 교체중이면 true
// - 히스토리에 일부를 삭제하면 히스토리를 다시 지정하여 프롬프트를 재시작이 필요
let shouldReplacePrompt = false;

// 변수를 정의
// - 프롬프트
let prompt = null;
// - 커맨드 목록
let command = {};
// - 히스토리 목록
let history = [];
// - 연결 목록
let connections = {};

// 기능을 정의
// 커맨드와 히스토리 파일이 쓰는 시점에서 수정이 되었는지 확인
const modifications = {
  // 읽은 시점에 시간을 보관
  command: null,
  history: null,
  commandLoaded: function () { this.command = this.time(spec.commandFile); },
  historyLoaded: function () { this.history = this.time(spec.historyFile); },
  // 현재 시점에 파일이 수정되었는지 확인
  commandModified: function () { return this.command && !equals(this.command, this.time(spec.commandFile)); },
  historyModified: function () { return this.history && !equals(this.history, this.time(spec.historyFile)); },
  modified: function () { return this.commandModified() || this.historyModified(); },
  // 파일에서 수정시간을 확인
  time: function (file) { return Fs.statSync(file).mtime.getTime(); },
};

//
// 모듈 초기화를 자동으로 실행합니다
// - NODEJS 런타임에서 호출하면 자동으로 run() 함수를 실행
//
init({initial: true});

// 모듈을 초기화
function init(state = {initial: false, reload: false}) {
  // NODEJS 런타임에서 호출하면 자동으로 run() 함수를 실행합니다
  const whenNodeRuntime = state && state.initial && spec.configure.node;
  if (whenNodeRuntime) run();
}

// 모듈을 실행
function run() {
  // 환영 메시지를 출력합니다
  logging(spec.welcome);

  // 프로그램 인자를 구문분석합니다
  const helpOff = false;
  const param = Parser.help(helpOff).parse(process.argv.slice(2));
  const parse = { ...param, argv: param._, seq: 0 };

  // 프로그램 인자에서 접속할 URL 정보를 구분합니다
  for (const url of parse.argv) {
    // id 생성: url0, url1, url2
    const id = `url${parse.seq++}`;
    // id 마다 접속할 URL 구성
    connections[id] = { url: [url] };
  }

  // 히스토리 파일과 커맨드 파일을 전체경로로 출력합니다
  // - --prj=[프로젝트 이름]            // 프로젝트 이름으로 한번에 커맨드와 히스토리 파일이름을 변경
  // - --cmd=[커맨드 파일이름]
  // - --history=[히스토리 파일이름]
  if (parse.prj) parse.cmd = `${parse.prj}-command`;
  if (parse.prj) parse.history = `${parse.prj}-history`;
  spec.commandFile = Path.join(spec.configure.pwdPath, parse.cmd ? parse.cmd : spec.commandFile);
  spec.historyFile = Path.join(spec.configure.pwdPath, parse.history ? parse.history : spec.historyFile);
  logging(`  % command=${spec.commandFile}`);
  logging(`  % history=${spec.historyFile}`);
  logging(spec.newline);

  // 실행 경로와 URL 현황을 출력합니다 /접속상태는 제외/
  const statesOff = false;
  onUrl(statesOff);

  // 연결이 한 개도 없으면 프로그램을 종료합니다
  const whenNoConnections = zero(items(connections));
  if (whenNoConnections) {
    // 사용방법을 출력
    logging(kUsage)
    // 프로그램을 종료
    const saveOff = false;
    exit(saveOff);
  }
  logging(spec.newline);

  // 커맨드 파일을 로드합니다
  const whenExistsCommandFile = Fs.existsSync(spec.commandFile);
  if (whenExistsCommandFile) {
    // 커맨드 파일을 읽은 시점에 수정시간을 보관
    modifications.commandLoaded();
    // 커맨드 파일을 로드
    const yaml = Fs.readFileSync(spec.commandFile);
    // YAML 형식을 JSON 형식으로 변환
    command = Yaml.load(yaml);
  }

  // 히스토리 파일을 로드합니다
  const whenExistsHistoryFile = Fs.existsSync(spec.historyFile);
  if (whenExistsHistoryFile) {
    // 히스토리 파일을 읽은 시점에 수정시간을 보관
    modifications.historyLoaded();
    // 히스토리 파일을 로드
    const text = Fs.readFileSync(spec.historyFile).toString();
    // TEXT 형식을 배열로 변환하고 역순으로 변경하고 빈 라인을 제거
    history = text.split(`\n`).reverse().filter((line) => !empty(line));
    // 히스토리가 최대치보다 많으면 과거부터 삭제
    while (items(history) > spec.maxHistorySize) history.pop();
  }

  // 웹소켓을 시작합니다
  letsConnections();

  // 키입력을 시작합니다
  letsKeys();

  // 프롬프트를 시작합니다
  letsPrompts();
}

// 키입력을 시작합니다
function letsKeys() {
  // 프롬프트에서 ESC 키를 눌러 입력한 라인을 삭제
  process.stdin.on(`keypress`, function onKeyPress(_, key) {
    // 입력한 라인에 삭제가 필요한지 확인
    const whenClearPrompt = key && equals(key.name, `escape`) && prompt && !empty(prompt.line);
    if (whenClearPrompt) {
      // 프롬프트에서 입력하던 라인을 삭제
      const [clearLineLeft, clearLineRight, clearLineWhole] = [-1, 1, 0];
      Prompt.clearLine(process.stdout, clearLineWhole);
      // 커서 위치를 처음으로 이동
      const [cursorToX, cursorToY] = [0, undefined];
      Prompt.cursorTo(process.stdout, cursorToX, cursorToY);
      // 입력한 라인을 삭제
      prompt.line = '';
      // 프롬프트를 출력
      prompt.prompt();
    }
  });
}

// 프롬프트를 시작
function letsPrompts() {
  // 이전 프롬프트가 이미 있는지 확인합니다
  const whenAlreadyExistsPrompt = prompt;
  if (whenAlreadyExistsPrompt) {
    // 이전 프롬프트 대체를 시작
    shouldReplacePrompt = true;
    // 이전 프롬프트 종료
    prompt.close();
  }

  // 새로운 프롬프트를 시작합니다
  prompt = Prompt.createInterface({
    // 입력라인에서 입출력을 활용
    input: process.stdin,
    output: process.stdout,
    // 터미널로 설정
    terminal: true,
    // 프롬프트를 설정
    prompt: spec.prompt,
    // 히스토리를 설정
    history: history,
    // 히스토리 최대수를 설정
    historySize: spec.maxHistorySize,
    // 커맨드를 자동완성
    completer: onPromptAutoComplete,
  });

  // 프로그램을 종료 이벤트를 처리
  prompt.on(`close`, function onPromptClose() {
    // 프로그램을 종료를 확인
    const whenProgramExit = !shouldReplacePrompt;
    // 파일이 수정됐으면 저장이 없이 종료, 수정되지 않았으면 저장하고 종료
    const shouldSaveWhenNotModified = modifications.modified() ? false : true;
    if (whenProgramExit) exit(shouldSaveWhenNotModified);
    // 새로운 프롬프트로 대체를 완료
    shouldReplacePrompt = false;
  });

  // 프롬프트에서 입력한 라인을 처리
  prompt.on(`line`, function onPromptLine(line) {
    onPrompt(line);
  });

  //
  // 내부 함수
  //

  // 프롬프트에서 커맨드를 자동완성
  // - line: 프롬프트에서 받은 문자열
  function onPromptAutoComplete(line) {
    // 예약어를 배열로 작성
    const reserves = spec.reserves.split(' ');
    // 예약어와 커맨드를 하나로 합침
    const completions = [...reserves, ...Object.keys(command).sort()];
    // 입력한 커맨드를 배열로 변경
    const commands = line.split(' ');
    // 입력한 마지막 커맨드를 확인
    const lastCmd = commands.slice(-1)[0];
    // 입력한 마지막 커맨드에 맞는 자동완성할 커맨드를 검색
    const hits = completions.filter(completion => completion.startsWith(lastCmd));
    // 자동완성할 커맨드와 함께 입력한 마지막 커맨드를 반환
    const hitsCompletionsAndPartial = [items(hits) ? hits : completions, lastCmd];
    return hitsCompletionsAndPartial;
  }
}

// 프롬프트에서 받은 라인을 처리
// - line: 프롬프트에서 받은 문자열
function onPrompt(line) {
  // 프롬프트 전후의 공백을 삭제합니다
  line = line.trim();

  // 라인에서 커맨드 예시와 구분분석 결과
  // - (enter)                            { _: [], cmd: undefined, sub: undefined }
  // - history                            { _: [], cmd: 'history', sub: undefined }
  // - history list                       { _: [ 'list' ], cmd: 'history', sub: 'list' }
  // - history 10                         { _: [ 10 ], cmd: 'history', sub: '10' }
  // - cmd get hi hi! --multiLine=true    { _: [ 'hi', 'hi!' ], multiLine: 'true', 'cmd': 'cmd', 'sub': 'get' }
  const helpOff = false;
  const param = Parser.help(helpOff).parse(line);
  const parse = { ...param, params: param._, raw: [...param._], cmd: param._.shift(), sub: param._[0] };

  // 프롬프트로 예약된 커맨드와 일반 커맨드를 처리합니다
  switch (parse.cmd) {
    // cmd 예약어는 커맨드를 처리합니다
    case `cmd`:
      // 커맨드를 처리
      const quickOff = false;
      onCmd(parse, quickOff);
      break;

    // quick 커맨드를 처리합니다 /cmd 예약어를 생략/
    case `get`: case `set`: case `del`:
      onCmd(parse);
      break;

    // url 예약어는 URL 현황을 보여줍니다
    case `url`: case `ll`: case `ls`:
      onUrl();
      break;

    // history 예약어는 그 동안에 입력했던 커맨드를 모두 보여줍니다
    case `history`:
      onHistory(parse);
      break;

    // clear 예약어는 전체화면을 지웁니다
    case `clear`:
      // 전체화면을 지움
      onCmdClear();
      break;

    // exit 예약어는 프로그램을 종료합니다
    case `exit`:
      // 커맨드와 히스토리를 파일에 저장하고 프로그램을 종료
      const whenNotModified = !modifications.modified();
      if (whenNotModified) exit();
      else prompt.question(`  detected modifications, overwrite command/history? [Y/n/c] `, function onAnswer(answer) {
        switch (answer.trim().toLowerCase()) {
          case `y`:
            // 커맨드와 히스토리를 파일에 저장하고 프로그램을 종료
            exit();
            break;
          case `c`:
            // 프롬프트를 출력
            output();
            break;
          case `n`: default:
            // 저장없이 프로그램을 종료
            const saveOff = false;
            exit(saveOff);
            break;
        }
      });
      break;

    // exit! 예약어는 히스토리와 커맨드 저장이 없이 프로그램을 종료합니다
    case `exit!`:
      // 저장없이 프로그램을 종료
      const saveOff = false;
      exit(saveOff);
      break;

    // help 예약어는 사용법을 제안합니다
    case `help`:
      // 도움말을 출력
      logging(kHelp)
      break;

    // 프롬프트를 일반 커맨드로 처리합니다
    default:
      // 커맨드를 처리
      onCmdSend();
      break;
  }

  // 히스토리가 최대치보다 많으면 과거부터 삭제
  while (items(history) > spec.maxHistorySize) history.pop();

  // 프롬프트를 출력
  output();

  //
  // 내부 함수
  //

  // 일반 커맨드를 처리
  function onCmdSend() {
    // 커맨드를 확인
    if (!empty(line)) {
      for (const cmd of parse.raw) if (!empty(cmd)) {
        // 커맨드에 있는지 확인
        let payload = empty(command[cmd]) ? null : command[cmd];
        // 알수없는 커맨드로 표시, 또는 유효한 커맨드는 페이로드를 전송
        if (!payload) output(`? ${cmd}`); else {
          // 감싸진 ' 또는 " 를 문자열에서 벗김
          payload = disclosureQuotes(payload);
          // 커맨드를 터미널에 표시
          output(`> ${cmd}: ${payload}`);
          // 지정한 커맨드를 전송
          send(payload);
        }
      }
    }
  }

  // 전체화면을 지움
  function onCmdClear() {
    // 커서를 모서리로 이동
    const [cursorToX, cursorToY] = [0, 0];
    Prompt.cursorTo(process.stdout, cursorToX, cursorToY);
    // 커서 아래의 화면을 삭제
    Prompt.clearScreenDown(process.stdout);
    // 환영 메시지를 출력
    logging(spec.simpleWelcome);
    // 프롬프트를 출력
    output();
  }
}

// 커맨드를 처리
// - parse: 라인을 구문분석한 결과
// - quick: quick 커맨드면 true
function onCmd(parse, quick = true) {
  // /quick 커맨드면/ cmd 가 생략된 것이므로 sub 를 cmd 로 맞춤
  if (quick) parse.sub = parse.cmd;
  // 전체 커맨드를 모두 출력
  const whenEmptySubCmd = !parse.sub;
  if (whenEmptySubCmd) cmdAll();
  // 커맨드를 구분하여 처리
  else switch (parse.sub) {
    case `list`:
      // 전체 커맨드를 모두 출력
      cmdAll();
      break;

    case `get`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 커맨드의 페이로드를 가져와 텍스트로 합침
      let [count, text] = [0, ``];
      // 가져올 커맨드를 확인
      for (const wildcard of parse.params) if (!empty(wildcard)) {
        // 가져올 커맨드를 전체 커맨드에서 검색
        for (const [cmd, payload] of Object.entries(command)) if (search(cmd, wildcard)) {
          // 텍스트 길이가 프롬프트 범위를 초과하는지 확인
          const whenLimit = text.length + payload.length > spec.maxPromptLimit;
          // 범위를 벗어난 커맨드를 출력
          if (whenLimit) logging(`- get ${cmd}: ${payload}`); else {
            // 합쳐질 커맨드를 출력
            logging(`+ get ${cmd}: ${payload}`);
            // 텍스트를 합침
            if (!empty(payload)) text += `'${payload}' `;
            // 텍스트를 합친 카운드
            count++;
          }
        }
      }
      // 텍스트 전후에 공백을 제거
      text = text.trim();
      // 텍스트가 비었는지 확인
      const whenPaste = !empty(text);
      // 텍스트가 있으면 프롬프트에 반영
      if (whenPaste) prompt.line = `cmd ${text}`;
      break;

    case `set`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 커맨드를 확인
      let whenSet = false;
      for (let i = 0; i < items(parse.params); i++) {
        let key, value;
        const cmd = parse.params[i];
        // 커맨드가 a=b 로 구성된 경우
        const whenDelimiter = !empty(cmd) && cmd.includes(`=`);
        if (whenDelimiter) {
          // 딜리미터로 커맨드와 페이로드를 분리
          const split = cmd.split(`=`);
          key = split[0];
          value = split[1];
        } else {
          // 다음 커맨드를 페이로드로 간주
          key = cmd;
          value = parse.params[i + 1];
          i++;
        }
        // set 가능여부를 확인
        const shouldSet = !empty(key) && !empty(value);
        // set 출력
        if (!shouldSet) logging(`- set ${key}: ${value}`); {
          // 커맨드를 추가
          command[key] = disclosureQuotes(value);
          // 지정한 커맨드를 출력
          logging(`+ set ${key}: ${command[key]}`);
          whenSet = true;
        }
      }
      if (whenSet) logging(`  ${items(command)} items`);
      break;

    case `del`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 삭제 대상인 커맨드를 검토
      const deletes = [];
      for (const wildcard of parse.params) {
        // 삭제 대상인 커맨드인지 검색
        for (const [cmd, payload] of Object.entries(command)) if (search(cmd, wildcard)) {
          // 커맨드를 출력하여 검토
          logging(`- ${cmd}: ${payload}`);
          deletes.push(cmd);
        }
      }
      // 검토한 항목이 있으면 삭제를 문답
      prompt.question(`  [Y/n]`, function onAnswer(answer) {
        switch (answer.trim().toLowerCase()) {
          case `y`:
            // 검토한 커맨드를 모두 삭제
            for (const cmd of deletes) delete command[cmd];
            // 삭제한 결과를 출력
            logging(`  ${items(command)} items (deleted ${items(deletes)} items)`);
            // 프롬프트를 출력
            output();
            break;
          case `n`: default:
            // 프롬프트를 출력
            output();
            break;
        }
      });
      break;

    case `load`: case `save`:
      // notImplemented@220511 joshua
      break;

    default:
      // 커맨드를 확인
      for (const cmd of parse.params) if (!empty(cmd)) {
        // 텍스트인지 확인
        const whenText = empty(command[cmd]);
        // 커맨드에 있는지 확인
        let payload = whenText ? cmd : command[cmd];
        // 감싸진 ' 또는 " 를 문자열에서 벗김
        payload = disclosureQuotes(payload);
        // 커맨드를 터미널에 표시
        if (whenText) output(`> ${payload}`);
        else output(`> ${cmd}: ${payload}`);
        // 지정한 커맨드를 전송
        send(payload);
      }
      break;
  }

  // 프롬프트를 출력
  output();

  //
  // 내부 함수
  //

  // 히스토리를 모두 출력
  function cmdAll() {
    // 전체 커맨드를 모두 출력
    logging(Yaml.dump(command, { lineWidth: -1 }).trim());
    logging(`  ${items(command)} items`);
  }
}

// URL 현황을 출력
// - states: 온라인/오프라인 상태구분이 필요하면 true
function onUrl(states = true) {
  let [online, offline] = [0, 0];
  for (const id in connections) {
    // 연결된 전체 목록에서 웹소켓을 연결을 확인
    const connection = connections[id];
    // 웹소켓 연결이 온라인 상태인지 확인
    const connected = connection && connection.client && equals(connection.client.readyState, 1);
    // +(온라인) / -(오프라인)을 카운트
    if (connected) online++; else offline++;
    // 상태 구분이 필요하면 +(온라인) / -(오프라인)으로 표기
    const state = !states ? `*` : connected ? `+` : `-`;
    // 접속상태와 URL 정보를 출력
    logging(`${state} [${id}] ${connection.url}`)
  }
  if (states) logging(`  ${items(connections)} items (online[+]: ${online}, offline[-]: ${offline})`);
}

// 히스토리 커맨드를 처리
// - parse: 라인을 구문분석한 결과
function onHistory(parse) {
  // 히스토리를 모두 출력
  const whenEmptySubCmd = !parse.sub;
  if (whenEmptySubCmd) historyAll(spec.showHistorySize);
  // 커맨드를 구분하여 처리
  else switch (parse.sub) {
    case `all`:
      // 히스토리를 모두 출력
      historyAll();
      break;

    case `del`:
      // sub 커맨드를 배열에서 삭제π
      parse.params.shift();
      // 히스토리를 복사하고
      let remain = history.slice().reverse();
      // 삭제 대상인 히스토리를 검토
      const shouldNotDelete = true;
      for (const wildcard of parse.params) remain = remain.filter(cmd => {
        // 일치하면 제거하고
        if (search(cmd, wildcard)) { logging(cmd); }
        // 일치하지 않은 항목을 남김
        else return shouldNotDelete;
      });
      // 검토한 항목이 있으면 삭제를 문답
      const deletes = items(history) - items(remain);
      if (deletes) prompt.question(`  [Y/n]`, function onAnswer(answer) {
        switch (answer.trim().toLowerCase()) {
          case `y`:
            // 검토한 히스토리를 모두 삭제
            history = remain.reverse();
            // 프롬프트를 다시 시작
            letsPrompts();
            // 삭제한 결과를 출력
            logging(`  ${items(history)} items (deleted ${deletes} items for [${parse.params}])`);
            // 프롬프트를 출력
            output();
            break;
          case `n`: default:
            // 프롬프트를 출력
            output();
            break;
        }
      });
      break;

    case `load`: case `save`:
      // notImplemented@220511 joshua
      break;

    default:
      // 히스토리 카운트를 확인
      const count = parse.params ? parseInt(parse.params[0]) : 0;
      // 히스토리 카운트만큼 출력
      if (!zero(count)) historyAll(count);
      break;
  }

  // 프롬프트를 출력
  output();

  //
  // 내부 함수
  //

  // 히스토리를 모두 출력
  // - count: 카운트만큼 히스토리를 출력하려면 > 0
  function historyAll(count = null) {
    if (count) {
      // 히스토리가 카운트보다 많으면 과거부터 삭제
      const copied = history.slice().reverse();
      while (items(copied) > count) copied.shift();
      // 히스토리를 카운트 만큼 출력 /반대로 출력해야 읽기가 쉬움/
      for (const line of copied) logging(`${line}`);
      // 히스토리 출력수와 전체수를 출력
      const whenLessThanTotal = items(copied) < count;
      if (whenLessThanTotal) logging(`  ${items(history)} items`);
      else logging(`  ${count} items (total ${items(history)} items)`);
    } else {
      // 히스토리를 모두 출력 /반대로 출력해야 읽기가 쉬움/
      for (const line of history.slice().reverse()) logging(`${line}`);
      logging(`  ${items(history)} items`);
    }
  }
}

// 전체 웹소켓에 접속
function letsConnections() {
  // 연결마다 웹소켓에 접속합니다
  for (const id in connections) {
    // 연결을 확인
    const [connection, options] = [connections[id], null];
    // 웹소켓 클라이언트에서 웹소켓 서버에 접속
    websocket(
      // 연결에 사용할 객체를 전달
      connection,
      // 접속할 정보를 전달
      connection.url,
      // 접속을 위한 옵션
      options,
      // 웹소켓에 연결되었음
      function onWebSocketOpen(client) {
        // 연결한 정보를 출력
        output(`< [${id}] open ${connection.url}`);
      },
      // 웹소켓이 끊겼음
      function onWebSocketClose(client, code, url, state, count) {
        // 끊긴 정보를 출력
        output(`< [${id}] close ${connection.url}`);
        // 연결이 모두 끊기면 프로그램을 종료
        online(function onState(states) {
          // 연결이 모두 끊겼는지 확인: 연결중인 항목이 없고 연결된 항목이 없으면 모두 끊긴것
          const whenOffline = zero(states.connecting) && zero(states.open);
          // 프로그램을 종료
          if (whenOffline) exit();
        });
        // 연결이 끊기면 재연결을 하지 않도록 0을 반환
        const shouldNotReconnection = 0;
        return shouldNotReconnection;
      },
      // 웹소켓에서 메시지를 받음
      function onWebSocketMessage(client, message) {
        output(`< [${id}] ${message}`);
      },
      // 웹소켓에서 에러를 받음
      function onError(client, error) {
        output(`< [${id}] error ${connection.url} '${error}'`);
      },
      // 웹소켓에서 PING 받음
      function onPing(client) {
        output(`< [${id}] ping`);
      },
      // 웹소켓에서 PONG 받음
      function onPong(client) {
        output(`< [${id}] pong`);
      },
    );
  }
}

//
// 함수를 구현
//

// 웹소켓으로 전송
// - payload: 전문
function send(payload) {
  let count = 0;
  // 연결된 전체 웹소켓으로 커맨드를 전송합니다
  if (!empty(payload)) for (const id in connections) {
    // 연결된 전체 목록에서 웹소켓을 연결을 확인
    const connection = connections[id];
    // 웹소켓 연결이 온라인 상태인지 확인
    const whenOnline = connection && connection.client && equals(connection.client.readyState, 1);
    // 연결된 웹소켓에 커맨드를 전송
    if (whenOnline) {
      connection.client.send(payload);
      count++;
    }
  }
  return count;
}

// 프롬프트를 지우고 커서 위치를 변경한 후에 출력하도록 변경
// - message: 출력할 메시지
// - cursor: 프롬프트 출력이 필요하면 true
// - preserveCursor: 커서의 위치를 유지하면서 프롬프트 출력이 필요하면 true
function output(message = undefined, cursor = true, preserveCursor = true) {
  if (prompt) {
    // 프롬프트와 입력하던 라인을 제거
    const [clearLineLeft, clearLineRight, clearLineWhole] = [-1, 1, 0];
    Prompt.clearLine(process.stdout, clearLineWhole);
    // 커서 위치를 처음으로 이동
    const [cursorToX, cursorToY] = [0, undefined];
    Prompt.cursorTo(process.stdout, cursorToX, cursorToY);
    // /메시지가 있으면/ 메시지를 출력
    if (message) logging(message);
    // /입력하던 라인이 있으면/ 입력하던 라인을 다시 출력
    if (!empty(prompt.line)) prompt.write(process.stdout, prompt.line);
    // 커서 위치를 유지하면서 프롬프트를 다시 출력
    if (cursor) prompt.prompt(preserveCursor);
  } else logging(message);
}

// 오프라인 상태인지 확인 /연결이 모두 끊겼으면 오프라인 상태로 판단/
// - onState(state): state 에 웹소켓 연결의 상태(connecting, open, closing, closed)마다 카운트를 전달
function online(onState) {
  // 연결 정보가 한개도 없으면 0
  if (zero(items(connections)))
    return 0;
  // 연결한 상태
  const [connecting, open, closing, closed] = [0, 1, 2, 3];
  // 연결한 상태에 대한 카운트
  const states = {
    [connecting]: { count: 0 },
    [open]:       { count: 0 },
    [closing]:    { count: 0 },
    [closed]:     { count: 0 },
  };
  // 연결한 상태를 구분하여 카운트
  for (const url in connections) {
    // 연결을 확인
    const connection = connections[url];
    // 연결한 상태를 구분하여 카운트
    if (connection && connection.client) states[connection.client.readyState].count++;
  }
  // 온라인 상태를 확인
  if (onState) onState({
    connecting: states[connecting].count,
    open: states[open].count,
    closing: states[closing].count,
    closed: states[closed].count,
  });
  // 온라인 수를 반환
  return states[open].count;
}

// 저장을 한후에 마지막 문구를 출력하고 프로그램을 종료
// - saveCommandAndHistory: 커맨드와 히스토리 파일을 저장
// - message: 종료직전에 출력할 마지막 문구
function exit(saveCommandAndHistory = true, messages = []) {
  // 일반 문자열이면 배열로 변경
  const whenNotArray = !Array.isArray(messages) && !empty(messages);
  if (whenNotArray) messages = [messages];
  // 연결정보가 없으면 문구를 추가
  if (zero(items(connections)) || !online()) messages.push(`No Connections`);
  // 커맨드와 히스토리를 파일에 저장하지 않음
  const whenSaveOff = !saveCommandAndHistory;
  if (whenSaveOff) messages.push(`No Saving`);
  // 커맨드와 히스토리를 파일에 저장
  else try {
    // 전체 커맨드를 JSON 형식에서 YML 형식으로 변환하고 커맨드 파일을 저장
    if (items(command)) Fs.writeFileSync(spec.commandFile, Yaml.dump(command, { lineWidth: -1 }));
    // 히스토리 배열을 TEXT 형식으로 변환하고 역순으로 변경하고 파일에 저장
    if (items(history)) Fs.writeFileSync(spec.historyFile, history.reverse().join('\n'));
    // 저장하고 종료
    messages.push(`Saving`);
  } catch (exc) {
    // 저장없이 종료
    messages.push(`No Saving`);
  }
  // 마지막 메시지를 출력
  const message = zero(items(messages)) ? `${spec.goodbye}` : `${spec.goodbye} (${messages})`;
  const promptOff = false;
  output(message, promptOff);
  // 프로그램을 종료
  process.exit(0);
}

//
// 공용함수를 구현
//

// 웹소켓 서버에 연결하고 요청과 응답을 한번에 처리, 실패한 경우에 재접속
// - http: 상태를 붙일 객체
// - url: 접속할 URL
// - options: 접속을 위한 옵션
// - onOpen: 연결된 경우
// - onClose: 끊긴 경우
// - onMessage: 메시지를 수신한 경우
// - onError: 에러가 있는 경우
// - onPing/onPong: PING/PONG 받은 경우
function websocket(connection, url, options, onOpen, onClose, onMessage, onError, onPing, onPong) {
  let self = { name: `websocket(connection, url, options)`, succeed: false };
  try {
    // 연결을 준비하는 상태
    if (!connection.state) { connection.state = `idle`; connection.reconnects = 0; }
    else connection.reconnects++;

    // 재접속 타이머를 삭제
    if (connection.timer) {
      clearTimeout(connection.timer);
      connection.timer = null;
    }

    // 접속 URL 설정
    if (!connection.url) connection.url = url;
    // 서버에 접속하고 연결에 클라이언트를 추가
    const client = connection.client = new Ws.WebSocket(url, options || {
      // 사설 인증서를 허용
      rejectUnauthorized: false
    });

    // 서버에 연결됨
    client.on(`open`, function () {
      // 연결된 상태
      connection.state = `open`;
      connection.reconnects = 0;

      if (onOpen) onOpen(client);
    });

    // 연결이 끊김
    client.on(`close`, function (code) {
      // 연결이 끊긴 상태
      if (equals(connection.state, `open`)) connection.state = `close`;

      // 종료 이벤트를 호출하고 재접속
      if (onClose) {
        // 재접속 간격을 확인하고 설정된 간격 후에 재접속을 시도
        const reconnectInterval = onClose(client, code, connection.url, connection.state, connection.reconnects);
        // 재접속 간격이 0 이거나 null/undefined 이면 재접속을 하지 않음
        const whenNeedReconnection = !zero(reconnectInterval);
        if (whenNeedReconnection) connection.timer = setTimeout(websocket, reconnectInterval,
          connection, url, options, onOpen, onClose, onMessage, onError, onPing, onPong);
      }
    });

    // 서버에서 메시지를 받음
    client.on(`message`, function (message) {
      if (onMessage) onMessage(client, message);
    });

    // 서버에서 PING 받음
    client.on(`ping`, function () {
      if (onPing) onPing(client);
    });

    // 서버에서 PONG 받음
    client.on(`pong`, function () {
      if (onPong) onPong(client);
    });

    // 서버에서 에러를 받음
    client.on(`error`, function (error) {
      if (onError) onError(error);
    });

    self.succeed = true;
  }
  catch (exc) {
    output(`exc=${self.exc = exc}`);
  }
  return self;
}

// 와일드 카드로 "*"(별표)를 사용하여 문자열을 검색
// - "a*b" => "a"로 시작하고 "b"로 끝나는 모든 것
// - "a*" => "a"로 시작하는 모든 것
// - "*b" => "b"로 끝나는 모든 것
// - "*a*" => "a"가 포함된 모든 것
// - "*a*b*"=> "a"가 뒤에 오는 모든 것, 뒤에 "b"가 오는 모든 것, 그 뒤에 오는 모든 것
// 예) "bird*" => bird 로 시작하는 모든 것
// - search("bird123", "bird*")                               // true
// - search("123bird", "*bird")                               // true
// - search("123bird123", "*bird*")                           // true
// - search("bird123bird", "bird*bird")                       // true
// - search("123bird123bird123", "*bird*bird*")               // true
// - search("s[pe]c 3 re$ex 6 cha^rs", "s[pe]c*re$ex*cha^rs") // true
// - search("should not match", "should noo*oot match")       // true
function search(string, wildcard) {
  // 어떤 문자를 포함하든 모든 문자열에서 검색이 가능한 표현으로 변경
  const escapeRegex = (str) => str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  // "."  => \n 또는 \r를 제외한 문자 찾기
  // ".*" => 0개 이상의 문자를 포함하는 모든 문자열과 일치
  wildcard = `${wildcard}`.split("*").map(escapeRegex).join(".*");
  // "^"  => 시작 부분에 다음이 있는 모든 문자열과 일치
  // "$"  => 끝에 있는 문자열과 일치
  wildcard = "^" + wildcard + "$"
  // 정규식으로 변환하여 검색
  const regex = new RegExp(wildcard);
  return regex.test(string);
}

// ' 또는 "로 감싸진 문자열을 제거
// - `'''{single}'''`           // `{single}`
// - `"""{double}"""`           // `{double}`
function disclosureQuotes(enclosure) {
  // 전후로 ' 발견 또는 " 발견
  const single = /^'.*'$/.test(enclosure);
  const double = /^".*"$/.test(enclosure);
  // ' 또는 "로 감싸져 있으면
  const enclosing = single || double;
  if (enclosing) {
    // 감싸진 것을 벗겨내고
    const disclosure = enclosure.substring(1, items(enclosure) - 2);
    // 감싸진 것이 없을 때까지 재귀호출로 반복하여 ' 또는 " 제거
    return disclosureQuotes(disclosure);
  }
  // 감싸진 것이 없을 때까지 반복하여 ' 또는 " 제거한 결과를 반환
  return enclosure;
}

// 값이 0인지 확인 (undefined, null 이면 값을 0으로 가정)
// - zero(undefined)    // true
// - zero(null)         // true
// - zero(0)            // true
function zero(num) {
  return typeof num === undefined || num === null || num === 0;
}

// 값이 비었는지 확인
// - empty(undefined)   // true
// - empty(null)        // true
// - empty('')          // true
// - empty('foo')       // false
// - empty(1)           // false
// - empty(0)           // false
function empty(value) {
  return typeof value === `string` && !value.trim() || typeof value === `undefined` || value === null;
}

// 배열(또는 맵) 대한 전체수를 반환
// - items(array)       // ok
// - items(map)         // ok
function items(obj) {
  if (!obj) return 0;
  return Array.isArray(obj) ? Object.keys(obj).length : Object.getOwnPropertyNames(obj).length;
}

// a와 b를 단순 비교
// - 타입과 값에 구분이 없이 비교
// - 같으면 true, 다르면 false
function equals(a, b) {
  return a === b;
}

// 터미널에 로그를 출력
function logging(msg) {
  console.log(msg);
}
