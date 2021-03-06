# 웹소켓 커맨드

웹소켓 커맨드는 웹소켓 서버에 연결하여 텍스트와 JSON을 주고받기 위한 커맨드 도구입니다

# 기능

- WS/WSS URL 멀티접속
- 텍스트와 JSON 전문을 커맨드로 정의
- 커맨드를 자동완성
- 커맨드와 히스토리를 자동으로 보관
- 커맨드와 히스토리를 프로젝트마다 별도로 관리

# 기술 배경과 목적

웹소켓 서버에 접속하고 텍스트와 JSON을 전문을 주고받는 커맨드 라인 도구가 많지 않습니다.

[echo.websocket.org](https://echo.websockt.org)에 접속하고 'hello, world!' 텍스트를 주고받는다고 가정해 봅시다.

[Postman](https://www.postman.com/)이 있습니다. 하지만 커맨드 라인 도구가 아니므로 제외하겠습니다.

어떻게 커맨드 라인에서 서버와 'hello, world!' 텍스트를 주고받을 수 있습니까?

[curl](https://github.com/curl/curl) 도구가 웹소켓 서버를 지원하면 좋겠습니다만, 아마도 이런 모습일 겁니다.

```shell
$ curl --include \
       --no-buffer \
       --header "Connection: Upgrade" \
       --header "Upgrade: websocket" \
       --header "Host: echo.websocket.org" \
       --header "Origin: http://echo.websocket.org" \
       --header "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
       --header "Sec-WebSocket-Version: 13" \
       http://echo.websocket.org/
```

웹소켓 클라이언트로 활용하기에 그다지 편리해 보이지 않습니다. 더구나 텍스트를 여러번 주고받을 수 없을 것 같습니다.

그러면 지금부터 웹소켓 커맨드를 실행하고 텍스트를 보내볼까요?

```shell
$ ./wscmd ws://echo.websocket.org/
wscmd 1.0.0 - copyright (c) 2022 websocket command, written by ilshookim

  % cmd=bin/command
  % history=bin/history

* [url0] ws://echo.websocket.org
< [url0] open ws://echo.websocket.org

$ cmd 'hello, world!'
> 'hello, world!'
< [url0] 'hello, world!'

$ exit
Goodbye
```

텍스트를 쉽게 보낸 것 같습니까? 이제 텍스트를 조금 더 단순하게 만들고 보내볼까요?

```shell
$ ./wscmd ws://echo.websocket.org/

* [url0] ws://echo.websocket.org

$ cmd set hi='hello, world!'
+ set hi: hello, world!
  1 items

$ cmd hi
> 'hello, world!'
< [url0] 'hello, world!'

$ hi
> 'hello, world!'
< [url0] 'hello, world!'
```

텍스트를 hi 커맨드로 만들고 두번 보냈습니다.

텍스트를 더 쉽게 보낸 것 같습니까? 간단한 텍스트를 주고받을때 웹소켓 커맨드를 활용하면 편리하지 않을까요?

# 사용법

접속할 URL 없이 웹소켓 커맨드를 실행하면 도움말을 보여줍니다.

```shell
$ ./wscmd
wscmd 1.0.0 - copyright (c) 2022 websocket command, written by ilshookim

  % cmd=/Users/joshua/prj/serverless.cloud/wscmd/command
  % history=/Users/joshua/prj/serverless.cloud/wscmd/history

  usage: $ ./wscmd [options] wss://localhost:9511/topics
         $ ./wscmd [options] ws://localhost:9510/topics wss://localhost:9511/topics

  options: --cmd=command --history=history   - change command and history filename
           --prj=cloud-topics                - change at once command and history filename by project name

  > <esc>                                    - clear prompt
  > <tab>                                    - make auto-completion commands
  > <tab><tab>                               - show auto-completion commands/reserves

  > [name, …]                                - /quick/ run commands by name
    get [name, wildcard, …]                  - /quick/ get line which merged payloads by commands
    set [name=payload, name, payload, …]     - /quick/ set commands by name
    del [name, wildcard, …]                  - /quick/ delete commands by name

  > cmd                                      - show commands
    cmd [name, payload, …]                   - run commands by name, payload
    cmd get [name, wildcard, …]              - get line which merged payloads by commands
    cmd set [name=payload, name, payload, …] - set commands by delimiter
    cmd del [name, wildcard, …]              - delete commands by name

  > url | ll | ls                            - show online states and urls

  > history [count]                          - show history until count (default=20)
    history all                              - show history (max=100)
    history del [wildcard]                   - delete history by wildcard

  > clear                                    - clear screen
    exit!                                    - program exit without any saving
    exit                                     - program exit with saving

Goodbye (No Connections)
```

## 기본편

커맨드는 주고받을 텍스트를 단순하게 만듭니다. 커맨드에 대해 조금 더 알아볼까요?

**팁! get set del는 자주쓰기 때문에 cmd 예약어를 생락하고 사용할 수 있어요.**

```shell
1) 커맨드 확인하기

$ cmd
hi: hello, world!
  1 items

2) hi 커맨드에서 텍스트를 프롬프트로 가져와 빠르게 편집하기

$ get hi
+ get hi: hello, world!
  1 items
$ cmd 'hello, world!'
  ^ 처음에 프롬프트 편집 위치

3) 가져온 텍스트를 편집하여 새로운 hi! 커맨드 만들기

$ get hi
+ get hi: hello, world!
  1 items
$ cmd set hi! 'I said, hello world!'
      ^ 프롬프트를 편집하여 다음을 추가: 'set hi! I said,'
+ set hi!: I said, hello world!
  2 items

4) 새로 만들어진 커맨드 확인하기

$ cmd
hi: hello, world!
hi!: I said, hello, world!
  2 items

5) 커맨드 주고받기

$ hi hi!
> 'hello, world!'
> 'I said, hello world!'
< [url0] 'hello, world!'
< [url0] 'I said, hello world!'
```

기존 커맨드에서 텍스트를 프롬프트로 가져와 빠르게 편집하고 새로운 커맨드로 추가했습니다. 그리고 두개의 hi hi! 커맨드를 한번에 보냈습니다.

## 응용편

지금까지 배운 것을 응용하여 텍스트와 커맨드를 함께 사용해 봅시다.

```shell
1) 커맨드 확인하기

$ cmd
hi: hello, world!
hi!: I said, hello world!
  2 items

2) 커맨드와 텍스트를 한번에 보내기

$ cmd hi 'I said' hi!
> 'hello, world!'
> 'I said'
> 'I said, hello world!'
< [url0] 'hello, world!'
< [url0] 'I said'
< [url0] 'I said, hello world!'

3) 반면에 cmd 예약어를 생략하면 커맨드는 보내지지만 텍스트는 보내지지 않습니다
   : 텍스트를 보내려면 반드시 cmd 예약어와 함께 사용해야 합니다

$ hi 'I said' hi!
> 'hello, world!'
? 'I said'
> 'I said, hello world!'
< [url0] 'hello, world!'
< [url0] 'I said, hello world!'
```

여러 커맨드를 가져와 한번에 텍스트로 보내봅시다.

**팁! 프롬프트에 붙일 수 있는 텍스트 길이에 제한이 있습니다. 262144 바이트보다 크면 텍스트를 가져오는 과정에서 텍스트 길이가 넘어가는 일부를 제외합니다.**

```shell
1) 커맨드 확인하기

$ cmd
hi: hello, world!
hi!: I said, hello world!
  2 items

2) 와일드카드(별표:*)를 이용하여 커맨드에서 텍스트를 가져와 한번에 보내기

$ get hi* hi
+ get hi: hello, world!
+ get hi!: I said, hello world!
+ get hi: hello, world!
$ cmd 'hello, world!' 'I said, hello world!' 'hello, world!'
> 'hello, world!'
> 'I said, hello world!'
> 'hello, world!'
< [url0] 'hello, world!'
< [url0] 'I said, hello world!'
< [url0] 'hello, world!'
```

커맨드를 삭제합니다.

```shell
1) 커맨드를 확인하기

$ cmd
hi: hello, world!
hi!: I said, hello world!
  2 items

2) 커맨드를 삭제하기

$ del hi
- hi: hello, world!
  [Y/n]

3) 와일드카드(별표:*)를 이용하여 커맨드를 모두 삭제하기

$ del *
- hi: hello, world!
- hi!: I said, hello world!
  [Y/n] y
  0 items (deletes 2 items)
```

## 히스토리 확인

프롬프트에서 위, 아래 키를 눌러 히스토리를 위 아래로 넘길 수 있습니다.

history 10 과 같이 커맨드에 카운트를 주고 원하는만큼 히스토리를 확인합니다. history all 커맨드로 전체 히스토리를 확인합니다.

**팁! history 커맨드에 카운트를 생략하면 기본값은 20개 입니다.**

```shell
$ history
cmd say
cmd
cmd set hi 'hello, world!'
cmd
get hi
cmd set hi! 'hello, world!'
cmd
hi*
cmd hi*
cmd hi hi!
sub*
cmd sub*
get hi*
cmd get hi* hi
cmd 'hello, world!' 'hello, world!' 'hello, world!'
del hi
y
url
exit
history
20 items (total 94 items)
$
```

## 접속현황 확인하기

다수의 접속할 URL을 한번에 주고 웹소켓 커맨드를 실행할 수 있습니다.

url, ll, ls 커맨드로 URL 현황을 확인합니다.

**팁! URL 현황에서 +표시는 온라인을 나타내고 -표시는 오프라인를 나타냅니다**

```shell
$ ./wscmd wss://locallhost:9511/topics wss://localhost:9521/topics

$ url
+ [url0] wss://localhost:9511/topics
- [url1] wss://localhost:9521/topics
  2 items (online[+]: 1, offline[-]: 1)
```

## 기타 커맨드

TAB 키를 한번 눌러 커맨드를 자동완성합니다. TAB 키를 두번 눌러 자동완성 목록을 볼 수 있습니다.

```shell
$ his
     ^ <tab> his -> history

$ hi<tab><tab>
hi        hi!        history
```

ESC 키를 눌러 프롬프트를 삭제합니다. 커맨드에서 텍스트를 가져오고 ESC 키를 눌러 프롬프트를 삭제해봅시다.

```shell
$ get hi* hi
+ get hi: hello, world!
+ get hi!: I said, hello world!
+ get hi: hello, world!
$ cmd 'hello, world!' 'I said, hello world!' 'hello, world!'
  ^ 1) 프롬프트 편집 위치
  ^ 2) <esc>키를 눌러 프롬프트를 삭제
$ 
  ^ 3) 프롬프트가 삭제됨
```

전체화면을 지웁니다.

```shell
$ clear
```

도움말을 보여줍니다.

```shell
$ help
```

종료합니다.

```shell
$ exit
Goodbye
```

저장없이 종료합니다.

```shell
$ exit!
Goodbye (No Saving)
```

# 프로젝트 활용법

프로젝트마다 커맨드, 히스토리를 별도로 관리해봅시다.

웹소켓 커맨드를 실행할 때 프로젝트 이름만 지정하면 됩니다.

```shell
$ ./wscmd --prj=echo ws://echo.websocket.org
```

프로젝트 이름을 지정하면 이전 커맨드와 히스토리를 모두 복원하여 프로젝트마다 마지막 작업하던 상태에서 다시 시작할 수 있습니다.

예컨대 프로젝트 이름을 --prj=echo 라고 지정한 작업은 종료시 echo-command, echo-history에 보관합니다.

```shell
% vi echo-command
% vi echo-history
```

보관된 파일은 텍스트 파일이므로 편집기에서 직접 열고 수정할 수 있습니다.

## ECHO 서버 예시

- echo 프로젝트에서 시작
- echo 서버에 접속
- hello, world! 텍스트를 주고받기

```shell
$ ./wscmd --prj=echo ws://echo.websocket.org
wscmd 1.0.0 - copyright (c) 2022 websocket command, written by ilshookim

  % cmd=bin/echo-command
  % history=bin/echo-history

* [url0] ws://echo.websocket.org

< [url0] open ws://echo.websocket.org

$ cmd 'hello, world!'
> 'hello, world!'
< [url0] 'hello, world!'

$ exit
Goodbye
```

## 클라우드 토픽서버 예시

- cloud-topics 프로젝트에서 시작
- 클라우드 토픽서버에 접속
- 클라우드 토픽서버에서 구독
- 클라우드 토픽서버로 게시

```shell
$ ./wscmd --prj=cloud-topics wss://localhost:9511/topics
wscmd 1.0.0 - copyright (c) 2022 websocket command, written by ilshookim

  % cmd=bin/cloud-topics-command
  % history=bin/cloud-topics-history

* [url0] wss://localhost:9511/topics

< [url0] open wss://localhost:9511/topics
< [url0] {"command":"welcome","pid":5429,"uid":"JkzOa-0i4t","path":"/topics","latest":{"epoch":1652214743205,"ts":"2022-05-11 05:32:23.205"}}

$ cmd set sub+ {"command":"subscribe","topic":"/myhome/grandfloor/+room/temperature"}
$ cmd set sub# {"command":"subscribe","topic":"/myhome/grandfloor/#"}
$ cmd set sub-kitchen {"command":"subscribe","topic":"/myhome/grandfloor/kitchen/temperature"}
$ cmd set sub-bedroom {"command":"subscribe","topic":"/myhome/grandfloor/bedroom/temperature"}
$ cmd set unsub+ {"command":"unsubscribe","topic":"/myhome/grandfloor/+room/temperature"}
$ cmd set unsub# {"command":"unsubscribe","topic":"/myhome/grandfloor/#"}
$ cmd set unsub-kitchen {"command":"unsubscribe","topic":"/myhome/grandfloor/kitchen/temperature"}
$ cmd set unsub-bedroom {"command":"unsubscribe","topic":"/myhome/grandfloor/bedroom/temperature"}
$ cmd set pub-kitchen {"command":"publish","topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree"}
$ cmd set pub-kitchen-reply {"command":"publish","topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree","reply":true}
$ cmd set pub-bedroom-on {"command":"publish","topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree","autoDelete":true}
$ cmd set pub-bedroom-off {"command":"publish","topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree","autoDelete":false}

$ sub+
> {"command":"subscribe","topic":"/myhome/grandfloor/+room/temperature"}
< [url0] {"pattern":"/myhome/grandfloor/+room/temperature","matches":{"room":"kitchen"},"uid":"2hB9kPuzgp","state":"permanent","ts":"2022-05-11 05:32:23.205","epoch":1652214743205,"topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree"}

$ sub#
> {"command":"subscribe","topic":"/myhome/grandfloor/#"}
< [url0] {"pattern":"/myhome/grandfloor/#","uid":"2hB9kPuzgp","state":"permanent","ts":"2022-05-11 05:32:23.205","epoch":1652214743205,"topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree"}

$ pub-kitchen
> {"command":"publish","topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree"}
< [url0] {"pattern":"/myhome/grandfloor/#","uid":"AkAhs5ne2x","state":"permanent","ts":"2022-05-12 23:17:02.687","epoch":1652365022687,"topic":"/myhome/grandfloor/kitchen/temperature","message":"25 degree"}

$ pub-bedroom-on
> {"command":"publish","topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree","autoDelete": true}
< [url0] {"pattern":"/myhome/grandfloor/#","uid":"1Qv1YRqMIJ","state":"ephemeral","ts":"2022-05-12 23:17:25.861","epoch":1652365045861,"topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree"}

$ pub-bedroom-off
> {"command":"publish","topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree","autoDelete": false}
< [url0] {"pattern":"/myhome/grandfloor/#","uid":"bK4Jma2dS0","state":"permanent","ts":"2022-05-12 23:17:48.364","epoch":1652365068364,"topic":"/myhome/grandfloor/bedroom/temperature","message":"28 degree"}

$ exit
Goodbye
```

고맙습니다 - I loved programming alone. Written by [ilshookim](ilshookim@gmail.com).

# 계획

## v1.0

wscmd v1.0 오픈소스는 일주일 정도 작업하여 완성을 하였습니다.

npm 모듈과 node, npm, pkg 기술을 공유해 주신 분들께 감사드립니다.

node: v16.9.1, npm: 8.5.0, pkg: 5.6.0
modules: "js-yaml": "^4.1.0", "ws": "^8.6.0", "yargs": "^17.4.1"

## v2.0 (가까운 계획)

다음 버전은 3개 기능을 주안점으로 지원하려고 합니다. 언젠가 여유가 있을 때 작업하도록 하겠습니다.

1) 다수의 웹소켓 연결을 관리하고 (url set/get/add/del/open/close)
2) 연결을 선택하여 커맨드를 주고받으며 (url sel/all)
3) 주고받을시 텍스트를 원하는대로 바꿀 수 있습니다 (${epoch,ts,uid,seq,rand,param}과 --parameters, $delay)

## v3.0 (먼 계획)

먼 언젠가 고려할 수 있습니다.

1) REST 지원을 하고 (rest get/post/put/del url)
2) 커맨드를 묶어 다양한 테스트를 가능하게 합니다 (test set/get/dup --repeat --interval)
3) 그리고 멀티 프로세스와 멀티 스레드에서 TPS 측정을 가능하게 합니다 (test --tps --process --thread)

# 라이선스

Dual License: GPLv3 (The GNU General Public License v3.0) or Licensed under Commercial

누구나 무료로 실행파일을 다운로드 받고 사용할 수 있습니다.

수정한 소스를 공개하면 누구나 무료로 소스를 사용하실 수 있습니다.

만약에 소스 공개가 어려운 기업이면 별도로 문의를 주세요.
