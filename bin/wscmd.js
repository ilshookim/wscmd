/**
 * bin/wscmd: copyright (c) 2022 websocket command, designed by ilshookim
 * 1 들여쓰기: 스페이스 2 고정, UTF8 NoBOM, 라인 주석은 23 또는 53 컬럼에서 남김
 * 2 문자포맷: 백틱을 사용 `${expr}`
 * 3 정의방식: 상수 const, 변수 let, 항상 세미콜론을 사용 (예외처리 try-catch, 함수 정의에서 제외)
 * 4 로그레벨: none > error > warn > info > http > verbose > debug > silly
 * 5 작성순서: 포함, 환경, 함수, 상수, 모듈, 노출, 프로그램 정의, 함수 정의 순으로 작성
 */

`use strict`;

/*
  웹소켓 서버에 접속하고 커맨드 입출력 기능을 제공하는 websocket command

  1. WS/WSS URL 멀티접속 지원
  2. 터미널 입력과 자동완성 지원
  3. 커맨드와 히스토리 파일을 지원
*/

// 포함
const Fs = require(`fs`);
const Ws = require(`ws`);
const Path = require(`path`);
const Yaml = require(`js-yaml`);
const Yargs = require(`yargs`);
const Readline = require(`readline`);

// 환경
const configure = {
  // 경로 구분
  name: `bin`,
  // 버전
  version: `1.0.0`,
  // 작성자
  written: `copyright (c) 2022 websocket command, written by ilshookim`,
  // 프로그램
  execute: `wscmd`,
  // 실행 경로
  pwdPath: process.env.PWD ? process.env.PWD : process.cwd(),
  // 패키지를 구분
  pkg: process.pkg ? true : false,
};

// 함수
const functions = {
  // 프롬프트를 시작
  prompts: letsPrompts,
  // 전체 서버에 연결을 시작
  connections: letsConnections,
  // 페이로드를 연결로 보냄
  sender: sender,
  // 터미널에 출력하고 프롬프트를 표시
  render: render,
  // 온라인 상태의 연결수를 확인
  online: online,
  // 프로그램을 종료
  goodbye: goodbye,
  // 웹소켓으로 연결
  websocket: websocket,
  // 0 인지 확인
  zero: zero,
  // 비었는지 확인
  empty: empty,
  // 항목수를 확인
  items: items,
  // 같은지 비교
  equals: equals,
  // 문자열에서 와일드카드 *(별표)를 이용하여 검색
  search: search,
  // ' 또는 " 로 감싸진 문자열을 모두 벗겨냄
  disclosureQuotes: disclosureQuotes,
};

// 상수
const constants = {
  // 모듈 경로: bin/wscmd
  name: `${Path.join(configure.name, Path.basename(module.filename))}`,
  // 환영 메시지
  welcome: `${configure.execute} ${configure.version} - ${configure.written}\n`,
  // 예약어 목록
  reserved: `help history cmd get set del clear exit exit!`,
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
  // ESC 키로 입력중인 커맨드를 모두 삭제
  clearPromptWhenEscKey: true,
  // 프롬프트 형식
  prompt: `$ `,
};

// 도움말
const kUsageNpm =
  `  usage: $ npm run ${configure.execute} -- [options] wss://localhost:9511/topics\n` +
  `         $ node bin/${configure.execute} [options] ws://localhost:9510/topics wss://localhost:9511/topics\n\n`;

const kUsagePkg =
  `  usage: $ ./${configure.execute} [options] wss://localhost:9511/topics\n` +
  `         $ ./${configure.execute} [options] ws://localhost:9510/topics wss://localhost:9511/topics\n\n`;

const kOptions =
  `  options: --cmd=command --history=history   - change command and history filename\n` +
  `           --prj=cloud-topics                - change at once command and history filename by project name\n\n`;

const kKeys =
  `  > <esc>                                    - clear prompt\n` +
  `  > <tab>                                    - make auto-completion commands\n` +
  `  > <tab><tab>                               - show auto-completion commands/reserves\n\n`;

const kUsage =
  `${configure.pkg ? kUsagePkg : kUsageNpm}` +
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
  `  > history [count]                          - show history until count (default=${constants.showHistorySize})\n` +
  `    history all                              - show history (max=${constants.maxHistorySize})\n` +
  `    history del [wildcard]                   - delete history by wildcard\n` + `\n` +
  `  > clear                                    - clear screen\n` +
  `    exit!                                    - program exit without any saving\n` +
  `    exit                                     - program exit with saving\n`;

const kHelp =
  `\n${kUsage}`;

// 모듈
const spec = {
  ...constants,
  configure: configure,
};

// 노출
module.exports = {
  ...spec,
  ...functions,
  run: run,
};

//
// 웹소켓 CLI 구현
//

// 플래그를 정의
// - 저장하고 종료하는지: 저장하려면 true
let shouldSavingWhenExit = true;
// - 프롬프트가 교체중인지: 교체중이면 true
//   히스토리를 삭제하면 히스토리를 다시 지정하여 프롬프트를 다시 시작하게됨
let shouldReplacePrompt = false;
// - 프롬프트를 미리 처리했는지: 다음 프롬프트 출력을 생략하려면 true
let shouldRenderPrompt = true;

// 변수를 정의
// - 프롬프트
let prompt;
// - 커맨드 목록
let command = {};
// - 히스토리 목록
let history = [];
// - 연결 목록
let connections = {};

//
// 프로그램을 실행합니다
//
run();

// 프로그램을 실행
function run() {
  // 환영 메시지를 출력합니다
  console.log(constants.welcome);

  // 프로그램 인자를 구문분석합니다
  const helpOff = false;
  const param = Yargs.help(helpOff).parse(process.argv.slice(2));
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
  spec.commandFile = Path.join(configure.pwdPath, parse.cmd ? parse.cmd : spec.commandFile);
  spec.historyFile = Path.join(configure.pwdPath, parse.history ? parse.history : spec.historyFile);
  console.log(`  % cmd=${spec.commandFile}`);
  console.log(`  % history=${spec.historyFile}`);
  console.log(``);

  // 실행 경로와 URL 현황을 출력합니다
  const statesOff = false;
  onUrl(statesOff);

  // 연결이 한 개도 없으면 프로그램을 종료합니다
  const noConnections = zero(items(connections));
  // 한줄을 띄움
  if (!noConnections) console.log(``);
  // 프로그램을 종료
  else {
    // 사용방법을 출력
    console.log(kUsage)
    // 프로그램을 종료
    goodbye(`${constants.goodbye} (No Connections)`);
  }

  // 커맨드 파일을 로드합니다
  const commandFile = Fs.existsSync(spec.commandFile);
  if (commandFile) {
    // 커맨드 파일을 로드
    const yaml = Fs.readFileSync(spec.commandFile);
    // YAML 형식을 JSON 형식으로 변환
    command = Yaml.load(yaml);
  }

  // 히스토리 파일을 로드합니다
  const historyFile = Fs.existsSync(spec.historyFile);
  if (historyFile) {
    // 히스토리 파일을 로드
    const text = Fs.readFileSync(spec.historyFile).toString();
    // TEXT 형식을 배열로 변환하고 역순으로 변경하고 빈 라인을 제거
    history = text.split(`\n`).reverse().filter((line) => !empty(line));
    // 히스토리가 최대치보다 많으면 과거부터 삭제
    while (items(history) > constants.maxHistorySize) history.pop();
  }

  // 웹소켓을 시작합니다
  letsConnections();

  // 프롬프트를 시작합니다
  letsPrompts();
}

// 프롬프트를 시작
function letsPrompts() {
  // 이전 프롬프트를 종료합니다
  if (prompt) {
    // 프롬프트 대체를 설정
    shouldReplacePrompt = true;
    // 프롬프트 종료
    prompt.close();
  }

  // 프롬프트를 시작합니다
  prompt = Readline.createInterface({
    // 입력라인에서 입출력을 활용
    input: process.stdin,
    output: process.stdout,
    // 터미널로 설정
    terminal: true,
    // 프롬프트를 설정
    prompt: constants.prompt,
    // 히스토리를 설정
    history: history,
    // 히스토리 최대수를 설정
    historySize: constants.maxHistorySize,
    // 커맨드를 자동완성
    completer: onPromptAutoComplete,
  });

  // 프로그램을 종료 이벤트를 처리
  prompt.on(`close`, function onPromptClose() {
    // 프로그램을 종료를 확인
    const shouldProgramExit = !shouldReplacePrompt;
    if (shouldProgramExit) {
      // 저장없이 종료
      if (!shouldSavingWhenExit) goodbye(`${constants.goodbye} (No Saving)`);
      // 히스토리 파일과 커맨드 파일을 저장하고 종료
      else {
        try {
          // 전체 커맨드를 JSON 형식에서 YML 형식으로 변환하고 커맨드 파일을 저장
          if (items(command)) Fs.writeFileSync(spec.commandFile, Yaml.dump(command, { lineWidth: -1 }));
          // 히스토리 배열을 TEXT 형식으로 변환하고 역순으로 변경하고 파일에 저장
          if (items(history)) Fs.writeFileSync(spec.historyFile, history.reverse().join('\n'));
          // 프로그램을 종료
          const message = !online() ? `${constants.goodbye} (No Connections)` : constants.goodbye;
          goodbye(message);
        }
        catch (exc) {
          // 저장없이 프로그램을 종료
          const message = !online() ? `${constants.goodbye} (No Saving, No Connections)` : constants.goodbye;
          goodbye(message);
        }
      }
    }
    // 프롬프트를 대체하는 중이면 프로그램을 종료하지 않음
    shouldReplacePrompt = false;
  });

  // 프롬프트에서 라인 이벤트를 처리
  prompt.on(`line`, function onPromptLine(line) {
    onPrompt(line);
  });

  // 프롬프트에서 ESC 키를 눌러 입력한 라인을 삭제
  if (constants.clearPromptWhenEscKey) process.stdin.on(`keypress`, function onKeyPress(ch, key) {
    // 입력한 라인에 삭제가 필요한지 확인
    const shouldClearPrompt = key && equals(key.name, `escape`) && prompt && !empty(prompt.line);
    if (shouldClearPrompt) {
      // 터미널에서 입력하던 라인을 삭제
      const [clearLineLeft, clearLineRight, clearLineWhole] = [-1, 1, 0];
      Readline.clearLine(process.stdout, clearLineWhole);
      // 커서 위치를 처음으로 이동
      const [cursorToX, cursorToY] = [0, undefined];
      Readline.cursorTo(process.stdout, cursorToX, cursorToY);
      // 입력한 라인을 삭제
      prompt.line = '';
      // 프롬프트를 출력
      prompt.prompt();
    }
  });

  //
  // 내부 함수
  //

  // 프롬프트에서 커맨드를 자동완성
  // - line: 프롬프트에서 받은 문자열
  function onPromptAutoComplete(line) {
    // 예약어를 배열로 작성
    const reserved = constants.reserved.split(' ');
    // 예약어와 커맨드를 하나로 합침
    const addCommand = true;
    const complete = addCommand ? [ ...reserved, ...Object.keys(command) ] : [ ...reserved ];
    // 입력한 커맨드를 배열로 작성
    const commands = line.split(' ');
    // 히트한 커맨드를 배열로 작성
    const hits = complete.filter((c) => c.startsWith(commands.slice(-1)));
    // 입력한 커맨드가 히트하였으면
    if ((items(commands) > 1) && (equals(items(hits), 1))) {
      // 커맨드를 자동완성하고
      const lastCmd = commands.slice(-1)[0];
      const pos = items(lastCmd);
      prompt.line = line.slice(0, -pos).concat(hits[0]);
      // 커서의 위치를 자동완성한 끝으로 이동
      prompt.cursor = items(prompt.line) + 1;
    }
    // 입력한 커맨드와 함께 히트한 경우 히트한 배열, 그렇지 않으면 커맨드 집합을 반환
    return [items(hits) ? hits.sort() : complete.sort(), line];
  }
}

// 프롬프트에서 받은 라인을 처리
// - line: 프롬프트에서 받은 문자열
function onPrompt(line) {
  // 프롬프트 전후의 공백을 삭제합니다
  line = line.trim();

  // 라인에서 커맨드 예시와 구분분석 결과
  // - (enter)                            { _: [], cmd: undefined, sub: undefined }
  // - option                             { _: [], cmd: 'option', sub: undefined }
  // - option add                         { _: [ 'add' ], cmd: 'option', sub: 'add' }
  // - option add 100                     { _: [ 'add', 100 ], cmd: 'option', sub: 'add' }
  // - option add 100 --multiLine=true    { _: [ 'add', 100 ], multiLine: 'true', 'cmd': 'option', 'sub': 'add' }
  const helpOff = false;
  const param = Yargs.help(helpOff).parse(line);
  const parse = { ...param, params: param._, raw: [...param._], cmd: param._.shift(), sub: param._[0] };

  // 프롬프트으로 예약된 커맨드와 일반 커맨드를 처리합니다
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
      // 프롬프트를 닫고 프로그램을 종료
      prompt.close();
      break;

    // exit! 예약어는 히스토리와 커맨드 저장이 없이 프로그램을 종료합니다
    case `exit!`:
      // 저장이 없이
      shouldSavingWhenExit = false;
      // 프롬프트를 닫고 프로그램을 종료
      prompt.close();
      break;

    // help 예약어는 사용법을 제안합니다
    case `help`:
      // 도움말을 출력
      console.log(kHelp)
      break;

    // 프롬프트를 일반 커맨드로 처리합니다
    default:
      // 커맨드를 처리
      onCmdSend();
      break;
  }

  // 히스토리가 최대치보다 많으면 과거부터 삭제
  while (items(history) > constants.maxHistorySize) history.pop();

  // 프롬프트를 출력
  if (shouldRenderPrompt) render();
  // 프롬프트를 다시 출력하도록 되돌림
  shouldRenderPrompt = true;

  //
  // 내부 함수로
  //

  // 일반 커맨드를 처리
  function onCmdSend() {
    // 커맨드를 확인
    if (!empty(line)) {
      for (const cmd of parse.raw) if (!empty(cmd)) {
        // 커맨드에 있는지 확인
        let payload = empty(command[cmd]) ? null : command[cmd];
        // 알수없는 커맨드로 표시
        if (!payload) render(`? ${cmd}`)
        // 유효한 커맨드는 페이로드를 전송
        else {
          // 감싸진 ' 또는 " 를 문자열에서 벗김
          payload = disclosureQuotes(payload);
          // 커맨드를 터미널에 표시
          render(`> ${payload}`);
          // 지정한 커맨드를 전송
          sender(payload);
        }
      }
    }
  }

  // 전체화면을 지움
  function onCmdClear() {
    // 커서를 모서리로 이동
    const [cursorToX, cursorToY] = [0, 0];
    Readline.cursorTo(process.stdout, cursorToX, cursorToY);
    // 커서 아래의 화면을 삭제
    Readline.clearScreenDown(process.stdout);
    // 환영 메시지를 출력
    console.log(constants.welcome);
    // URL 현황을 출력
    onUrl();
    // 프롬프트를 출력
    render();
  }
}

// 커맨드를 처리
// - parse: 라인을 구문분석한 결과
// - quick: quick 커맨드면 true
function onCmd(parse, quick = true) {
  // /quick 커맨드면/ cmd 가 생략된 것이므로 sub 를 cmd 로 맞춤
  if (quick) parse.sub = parse.cmd;
  // 커맨드를 구분하여 처리
  if (parse.sub) switch (parse.sub) {
    case `list`:
      // 전체 커맨드를 모두 출력
      cmdAll();
      break;

    case `get`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 페이로드를 가져와 문자열로 합침
      let [count, commands] = [0, `cmd `];
      // 가져올 커맨드를 확인
      for (const wildcard of parse.params) if (!empty(wildcard)) {
        // 커맨드에서 확인
        for (const [cmd, payload] of Object.entries(command)) {
          // 커맨드를 검색
          if (search(cmd, wildcard)) {
            // 검색한 커맨드를 출력
            console.log(`get ${cmd}: ${payload}`);
            // 커맨드를 문자열로 합침
            if (!empty(payload)) { commands += `'${payload}' `; count++; }
          }
        }
      }
      // 문자열로 합친 커맨드를 프롬프트에 반영
      prompt.line = commands.trim();
      // 문자열 끝으로 커서를 이동하고 프롬프트를 출력
      const [cursor, preserveCursor] = [true, false];
      render(`  ${count} items`, cursor, preserveCursor);
      // 프롬프트를 미리 출력하여 이후에는 프롬프트를 출력을 생략
      shouldRenderPrompt = false;
      break;

    case `set`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 커맨드를 확인
      let sets = false;
      for (let i = 0; i < items(parse.params); i++) {
        let key, value;
        const cmd = parse.params[i];
        // 커맨드가 a=b 로 구성된 경우
        const delimiter = !empty(cmd) && cmd.includes(`=`);
        if (delimiter) {
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
        const valid = !empty(key) && !empty(value);
        if (valid) {
          // 커맨드를 추가
          command[key] = disclosureQuotes(value);
          // 지정한 커맨드를 출력
          console.log(`set ${key}: ${command[key]}`);
          sets = true;
        } else {
          console.log(`set ${key}: undefined`);
        }
      }
      if (sets) console.log(`  ${items(command)} items`);
      break;

    case `del`:
      // /quick 커맨드가 아니면/ sub 커맨드를 배열에서 삭제
      if (!quick) parse.params.shift();
      // 삭제 대상인 커맨드를 검토
      const deletes = [];
      for (const wildcard of parse.params) {
        for (const [cmd, payload] of Object.entries(command)) {
          // 삭제 대상인 커맨드인지 확인
          if (search(cmd, wildcard)) {
            // 커맨드를 출력하여 검토
            console.log(`${cmd}: ${payload}`);
            deletes.push(cmd);
          }
        }
      }
      // 검토한 항목이 있으면 삭제를 질의
      if (items(deletes)) prompt.question(`  [Y/n] `, (answer) => {
        // 삭제를 결정
        const shouldDelete = equals(answer.toLowerCase(), `y`);
        if (shouldDelete) {
          // 검토한 커맨드를 모두 삭제
          for (const cmd of deletes) delete command[cmd];
          // 삭제한 결과를 출력
          console.log(`  ${items(command)} items (deleted ${items(deletes)} items)`);
        }
        // 프롬프트를 출력
        render();
      });
      break;

    case `load`: case `save`:
      // notImplemented@220511 joshua
      break;

    default:
      // 커맨드를 확인
      for (const cmd of parse.params) if (!empty(cmd)) {
        // 커맨드에 있는지 확인
        let payload = empty(command[cmd]) ? cmd : command[cmd];
        // 감싸진 ' 또는 " 를 문자열에서 벗김
        payload = disclosureQuotes(payload);
        // 커맨드를 터미널에 표시
        render(`> ${payload}`);
        // 지정한 커맨드를 전송
        sender(payload);
      }
      break;
  }
  else {
    // 전체 커맨드를 모두 출력
    cmdAll();
  }

  // 프롬프트를 출력
  if (shouldRenderPrompt) render();

  //
  // 내부 함수
  //

  // 히스토리를 모두 출력
  function cmdAll() {
    // 전체 커맨드를 모두 출력
    console.log(Yaml.dump(command, { lineWidth: -1 }).trim());
    console.log(`  ${items(command)} items`);
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
    const connected = connection && connection.ws && equals(connection.ws.readyState, 1);
    // +(온라인) / -(오프라인)을 카운트
    if (connected) online++; else offline++;
    // 상태 구분이 필요하면 +(온라인) / -(오프라인)으로 표기
    const state = !states ? `*` : connected ? `+` : `-`;
    // 접속상태와 URL 정보를 출력
    console.log(`${state} [${id}] ${connection.url}`)
  }
  if (states) console.log(`  ${items(connections)} items (online[+]: ${online}, offline[-]: ${offline})`);
}

// 히스토리 커맨드를 처리
// - parse: 라인을 구문분석한 결과
function onHistory(parse) {
  // 커맨드를 구분하여 처리
  if (parse.sub) switch (parse.sub) {
    case `all`:
      // 히스토리를 모두 출력
      historyAll();
      break;

    case `del`:
      // sub 커맨드를 배열에서 삭제
      parse.params.shift();
      // 히스토리를 복사하고
      let remain = history.slice().reverse();
      // 삭제 대상인 히스토리를 검토
      for (const wildcard of parse.params) remain = remain.filter(cmd => {
        // 일치하면 제거하고
        if (search(cmd, wildcard)) { console.log(cmd); }
        // 일치하지 않은 항목을 남김
        else return true;
      });
      // 검토한 항목이 있으면 삭제를 질의
      const deletes = items(history) - items(remain);
      if (deletes) prompt.question(`  [Y/n] `, (answer) => {
        // 삭제를 결정
        const shouldDelete = equals(answer.toLowerCase(), `y`);
        if (shouldDelete) {
          // 검토한 히스토리를 모두 삭제
          history = remain.reverse();
          // 프롬프트를 다시 시작
          letsPrompts();
          // 삭제한 결과를 출력
          console.log(`  ${items(history)} items (deleted ${deletes} items [${parse.params}])`);
        }
        // 프롬프트를 출력
        render();
      });
      break;

    case `load`: case `save`:
      // notImplemented@220511 joshua
      break;

    default:
      // 히스토리 카운트를 확인
      const count = parse.params ? parseInt(parse.params[0]) : 0;
      // 히스토리 카운트만큼 출력
      if (count > 0) historyAll(count);
      break;
  }
  else {
    // 히스토리를 모두 출력
    historyAll(constants.showHistorySize);
  }

  // 프롬프트를 출력
  render();

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
      for (const line of copied) console.log(`${line}`);
      console.log(`  ${count} items (total ${items(history)} items)`);
    } else {
      // 히스토리를 모두 출력 /반대로 출력해야 읽기가 쉬움/
      for (const line of history.slice().reverse()) console.log(`${line}`);
      console.log(`  ${items(history)} items`);
    }
  }
}

// 전체 웹소켓에 접속
function letsConnections() {
  // 연결마다 웹소켓에 접속합니다
  for (const id in connections) {
    // 연결을 확인
    const connection = connections[id];
    // 웹소켓 클라이언트에서 웹소켓 서버에 접속
    websocket(
      // 연결에 사용할 객체를 전달
      connection,
      // 접속할 정보를 전달
      connection.url,
      // 웹소켓에 연결되었음
      function onWebSocketOpen(ws) {
        // 연결한 정보를 출력
        render(`< [${id}] open ${connection.url}`);
      },
      // 웹소켓이 끊겼음
      function onWebSocketClose(code, url, state, count) {
        // 끊긴 정보를 출력
        render(`< [${id}] close ${connection.url}`);
        // 연결이 모두 끊기면 프로그램을 종료
        online(function onState(states) {
          // 연결이 모두 끊겼는지 확인: 연결중인 항목이 없고 연결된 항목이 없으면 모두 끊긴것
          const offline = zero(states.connecting) && zero(states.open);
          if (offline) {
            // 프롬프트를 종료하고 프로그램을 종료
            if (prompt) prompt.close();
            // 프로그램을 종료
            else goodbye(`${constants.goodbye} (No Connections)`);
          }
        });
        // 연결이 끊기면 재연결을 하지 않도록 0을 반환
        return 0;
      },
      // 웹소켓에서 메시지를 받음
      function onWebSocketMessage(message) {
        render(`< [${id}] ${message}`);
      },
      // 웹소켓에서 에러를 받음
      function onError(error) {
        render(`< [${id}] error ${connection.url} '${error}'`);
      },
      // 웹소켓에서 PING 받음
      function onPing() {
        render(`< [${id}] ping`);
      },
      // 웹소켓에서 PONG 받음
      function onPong() {
        render(`< [${id}] pong`);
      },
    );
  }
}

//
// 함수를 구현
//

// 웹소켓으로 전송
// - payload: 전문
function sender(payload) {
  let count = 0;
  // 연결된 전체 웹소켓으로 커맨드를 전송합니다
  if (!empty(payload)) for (const id in connections) {
    // 연결된 전체 목록에서 웹소켓을 연결을 확인
    const connection = connections[id];
    // 웹소켓 연결이 온라인 상태인지 확인
    const online = connection && connection.ws && equals(connection.ws.readyState, 1);
    // 연결된 웹소켓에 커맨드를 전송
    if (online) {
      connection.ws.send(payload);
      count++;
    }
  }
  return count;
}

// 프롬프트를 지우고 커서 위치를 변경한 후에 출력하도록 변경
// - message: 출력할 메시지
// - cursor: 프롬프트 출력이 필요하면 true
// - preserveCursor: 커서의 위치를 유지하면서 프롬프트 출력이 필요하면 true
function render(message = undefined, cursor = true, preserveCursor = true) {
  if (prompt) {
    // 프롬프트와 입력하던 라인을 제거
    const [clearLineLeft, clearLineRight, clearLineWhole] = [-1, 1, 0];
    Readline.clearLine(process.stdout, clearLineWhole);
    // 커서 위치를 처음으로 이동
    const [cursorToX, cursorToY] = [0, undefined];
    Readline.cursorTo(process.stdout, cursorToX, cursorToY);
    // /메시지가 있으면/ 메시지를 출력
    if (message) console.log(message);
    // /입력하던 라인이 있으면/ 입력하던 라인을 다시 출력
    if (!empty(prompt.line)) prompt.write(process.stdout, prompt.line);
    // 커서 위치를 유지하면서 프롬프트를 다시 출력
    if (cursor) prompt.prompt(preserveCursor);
  } else console.log(message);
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
    if (connection && connection.ws) states[connection.ws.readyState].count++;
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

// 마지막 문구를 출력하고 프로그램을 종료
// - message: 출력할 메시지
// - cursor: 프롬프트를 다시 출력하려면 true
function goodbye(message = constants.goodbye, cursor = false) {
  // 마지막 메시지를 출력
  render(message, cursor);
  // 프로그램을 종료
  process.exit(0);
}

// HTTP 웹소켓 요청과 응답을 한번에 처리, 실패한 경우에 재접속
// - http: 상태를 관리할 객체
// - url: 접속할 URL
// - onOpen: 연결된 경우
// - onClose: 끊긴 경우
// - onMessage: 웹소켓에서 메시지를 수신한 경우
// - onError: 웹소켓에 에러가 있는 경우
// - onPing/onPong: 웹소켓에서 PING/PONG 받은 경우
function websocket(http, url, onOpen, onClose, onMessage, onError, onPing, onPong) {
  let self = { name: `websocket(http, url, ...)`, succeed: false };
  try {
    // 연결을 준비하는 상태
    if (!http.state) { http.state = `idle`; http.reconnectCount = 0; }
    else http.reconnectCount++;

    // 재접속 타이머를 삭제
    if (http.reconnectTimer) {
      clearTimeout(http.reconnectTimer);
      http.reconnectTimer = null;
    }

    // 웹소켓 서버에 접속하고 HTTP.WS 추가
    if (!http.url) http.url = url;
    const ws = http.ws = new Ws.WebSocket(url, {
      // 사설 인증서를 허용
      rejectUnauthorized: false
    });

    // 웹소켓 오픈
    ws.on(`open`, function () {
      // 연결된 상태
      http.state = `open`;
      http.reconnectCount = 0;

      if (onOpen) onOpen(ws);
    });

    // 웹소켓 끊김
    ws.on(`close`, function (code) {
      // 연결이 끊긴 상태
      if (equals(http.state, `open`)) http.state = `close`;

      // 종료 이벤트를 호출하고 재접속
      if (onClose) {
        // 재접속 간격을 확인하고 설정된 간격 후에 재접속을 시도
        const reconnectInterval = onClose(code, http.url, http.state, http.reconnectCount);
        // 재접속 간격이 0 이거나 null/undefined 이면 재접속을 하지 않음
        if (!zero(reconnectInterval)) http.reconnectTimer = setTimeout(websocket, reconnectInterval,
          http, url, onOpen, onClose, onMessage, onError, onPing, onPong);
      }
    });

    // 웹소켓 연결에서 메시지를 받음
    ws.on(`message`, function (message) {
      if (onMessage) onMessage(message);
    });

    // 웹소켓 연결에서 PING 받음
    ws.on(`ping`, function () {
      if (onPing) onPing(ws);
    });

    // 웹소켓 연결에서 PONG 받음
    ws.on(`pong`, function () {
      if (onPong) onPong(ws);
    });

    // 웹소켓 연결에서 에러를 받음
    ws.on(`error`, function (error) {
      if (onError) onError(error);
    });

    self.succeed = true;
  }
  catch (exc) {
    render(`exc=${self.exc = exc}`);
  }
  return self;
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

// a와 b를 비교
// - 타입과 값에 구분이 없이 비교
function equals(a, b) {
  return a === b;
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
  wildcard = wildcard.split("*").map(escapeRegex).join(".*");
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
