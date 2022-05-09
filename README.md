# :pushpin: Nuber Eats

> [우버 이츠 클론코딩](https://nomadcoders.co/nuber-eats) 강의 백엔드 파트 결과물

## :calendar: 1. 제작 기간 & 참여 인원

- 2022.01.26 ~ 2022.03.15
  - 차후 불필요한 코드를 줄이는 작업, 프론트 파트에 따른 백엔드 파트 수정이 있을 예정
  - 2022.05.09 : GraphqlModule option 수정
- 개인 프로젝트

## :computer: 2. 사용 기술

- Node.js
- Nest.js
- GraphQL
- TypeORM
- PostgreSQL
- jsonwebtoken
- Jest

## :hammer: 3. ERD 설계

<details>
<summary>User</summary>
<div markdown="1">

- id
- createdAt
- updatedAt
- email
- password (hashed)
- role (client|owner|delivery)
- verified
- restaurants
- orders
- rides
- payments

</div>
</details>

<details>
<summary>Verification</summary>
<div markdown="1">

- id
- createdAt
- updatedAt
- code
- user

</div>
</details>

<details>
<summary>Restaurant</summary>
<div markdown="1">

- id
- createdAt
- updatedAt
- name
- address
- category
- coverImage
- owner
- menu
- orders
- isPromoted
- promotedUntil

</div>
</details>

<details>
<summary>Category</summary>
<div markdown="1">

- id
- createdAt
- updatedAt
- name
- coverImage
- slug
- restaurants

</div>
</details>

<details>
<summary>Dish</summary>
<div markdown="1">

- id
- createdAt
- updatedAt
- name
- price
- photo
- description
- options
- restaurant

</div>
</details>

<details>
<summary>Order</summary>
<div markdown="1">

- customer
- driver
- items
- total
- status

</div>
</details>

<details>
<summary>Payment</summary>
<div markdown="1">

- transactionId
- user
- restaurant

</div>
</details>

## :dart: 4. 구현 기능

<details>
<summary>Configuration</summary>
<div markdown="1">

- [NestJS ConfigModule](https://bit.ly/36iGBpI)
- [TypeORM ConfigModule](https://bit.ly/3JeR8kD)
- [GraphQL ConfigModule](https://bit.ly/3t9plw5)
- [Create jsonwebtoken middleware](https://bit.ly/3q6NBNw) (current not used)
- [Use jsonwebtoken middleware for '/graphql' routes, POST Method](https://bit.ly/3MRQGe2) (current not used)
- Config Role Based Authorization

  - [Create Role Decorator](https://bit.ly/3q4eNg1)
  - [Use Role Decorator in Resolver if need authorizaion](https://bit.ly/3CFuzTA)

</div>
</details>

<details>
<summary>User CRUD</summary>
<div markdown="1">

- [Create Account](https://bit.ly/3CWk0vL)
- [Log In](https://bit.ly/3JbumKn)
- [See Profile](https://bit.ly/3N0QF7Y)
- [Edit Profile](https://bit.ly/3wn7YdB)
- [Verify Email](https://bit.ly/3KKttsI)

</div>
</details>

<details>
<summary>Restaurant CRUD</summary>
<div markdown="1">

- [Create Restaurant](https://bit.ly/3t7xcdM)
- [Edit Restaurant](https://bit.ly/3tZVNjJ)
- [Delete Restaurant](https://bit.ly/3Ib2kNU)
- [See Categories](https://bit.ly/3tWzgof)
- [See Restaurants](https://bit.ly/3wnabFV)
- [See Restaurants by Category](https://bit.ly/3MSDrtS)
- [See Restaurant](https://bit.ly/36jP5Nj)
- [Search Restaurant](https://bit.ly/3JcyfPl)

</div>
</details>

<details>
<summary>Dish CRUD</summary>
<div markdown="1">

- [Create Dish](https://bit.ly/3JifBp5)
- [Edit Dish](https://bit.ly/3CQp30E)
- [Delete Dish](https://bit.ly/3icPC6o)

</div>
</details>

<details>
<summary>Order CRUD</summary>
<div markdown="1">

- [Create Order](https://bit.ly/3KLZGQ2)
- [Read Orders](https://bit.ly/3JcpPHr)
- [Read Order](https://bit.ly/3t7yYvs)
- [Edit Order](https://bit.ly/3ta6Pnm)
- [Take Order to Delivery](https://bit.ly/3wb4Cdl)

</div>
</details>

<details>
<summary>Order Subscription</summary>
<div markdown="1">

- [Pending Orders to Owner](https://bit.ly/3tapXBE)
- [Notification Cooked Status Order to Delivery](https://bit.ly/3tVVoPw)
- [Update Order Status](https://bit.ly/3JcUl4d)

</div>
</details>

<details>
<summary>Payment</summary>
<div markdown="1">

- [Create Payment (Promote Restaurant)](https://bit.ly/3IaJwOH)
- [Read Payment](https://bit.ly/3KHy5iZ)
- [Unpromoting Restaurants](https://bit.ly/3CIe4Go)

</div>
</details>

<details>
<summary>Unit Test</summary>
<div markdown="1">

![Unit Test Coverage](https://user-images.githubusercontent.com/68040092/158137463-cad1e00b-6ec3-4267-8623-1d3db93319cd.png)

- [User Service](https://bit.ly/3tZqIg6)
- [Mail Service](https://bit.ly/3q5WrLr)
- [JWT Service](https://bit.ly/3KM3oJs)
- [Restaurant Service](https://bit.ly/3ugAbjB)
- [Order Service](https://bit.ly/3I9SdJ1)
- [Payments Service](https://bit.ly/3tYmSDX)

</div>
</details>

<details>
<summary>E2E Test</summary>
<div markdown="1">

  <details>
  <summary>Current Test Coverage</summary>
  <div markdown="1">

![Screenshot from 2022-03-15 11-59-25](https://user-images.githubusercontent.com/68040092/158297526-b250d125-f2b7-44b5-ab47-b66fd624eb4c.png)
![Screenshot from 2022-03-15 11-59-50](https://user-images.githubusercontent.com/68040092/158297533-95cc0bba-f6df-4194-884b-1d0cffa8de0d.png)

  </div>
  </details>

- [User Resolver](https://bit.ly/35VZNtK)
- [Restaurant Resolver](https://bit.ly/3IbiAOI)
- [Order Resolver](https://bit.ly/3Ip1I7v)
- [Payment Resolver](https://bit.ly/3w2NiHv)

</div>
</details>

## :rotating_light: 5. 트러블 슈팅

<details>
<summary>프로필 수정 문제</summary>
<div markdown="1">

- 처음엔 userId, email, password를 입력받고 typeORM의 update 메소드를 이용해 유저 프로필을 수정하려고 했음
- 그러나, User entity의 비밀번호 해싱함수에 BeforeUpdate hook을 사용해도 비밀번호가 해싱되지 않는 문제가 발생
- update 메소드는 update query만 실행하기 떄문에, hook을 사용할 수 없는 문제가 있다는 걸 알았음
- 결과적으로, findOne 메소드로 userId를 통해 특정 user를 찾고, email과 password를 선택적으로 입력받았을 경우를 대비해 undefined가 아닌 경우에만 정보를 덮어씌우고 해당 유저를 save해주는 방식으로 변경하였음

:pushpin: [코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/2f113d1c89355ea0a7cb12cf4f401b05835d6f51/src/users/users.service.ts#L80)

</div>
</details>

<details>
<summary>비밀번호 변경 문제</summary>
<div markdown="1">

- 이메일 인증을 구현을 위해 DB의 relation을 이용해 User Table을 불러오고, 이메일 인증이 됐을 때 verified 컬럼의 값을 true로 바꾸려고 하였음
- 해당 user의 모든 정보를 가져와 verified 컬럼만 바꿔주고 save를 하려니, 해시되어있는 비밀번호도 같이 save를 통해 update가 되어버리면서 해시되어있는 비밀번호를 다시 해시하는 문제가 발생
- 그래서, 아래 2가지 조치를 취하였음
  - relation을 이용해 User Table을 가져올 때 password를 선택하지 않도록 하였음
    - :pushpin: [코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/2d323c1358f3f408afada866f1040f324dac358a/src/users/entities/user.entity.ts#L30)
    - 다만, 이후 findOne을 통해 특정 유저를 찾을 때는 필요한 컬럼을 선택해줄 필요가 생겼음
      - :pushpin: [코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/2d323c1358f3f408afada866f1040f324dac358a/src/users/users.service.ts#L59)
  - 비밀번호 해시 함수를 비밀번호를 입력받았을 때만 수정하도록 하였음
    - :pushpin: [코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/2d323c1358f3f408afada866f1040f324dac358a/src/users/entities/user.entity.ts#L46)

</div>
</details>

<details>
<summary>유닛 테스팅 파일 경로 에러 문제</summary>
<div markdown="1">

```
Cannot find module 'src/common/entities/core.entity' from 'users/entities/user.entity.ts'

    Require stack:
      users/entities/user.entity.ts
      users/users.service.ts
      users/users.service.spec.ts

       5 |   registerEnumType,
       6 | } from '@nestjs/graphql';
    >  7 | import { CoreEntity } from 'src/common/entities/core.entity';
         | ^
       8 | import { BeforeInsert, BeforeUpdate, Column, Entity } from 'typeorm';
       9 | import * as bcrypt from 'bcrypt';
      10 | import { InternalServerErrorException } from '@nestjs/common';

      at Resolver.resolveModule (../node_modules/jest-resolve/build/resolver.js:324:11)
      at Object.<anonymous> (users/entities/user.entity.ts:7:1)
```

- TypeScript를 쓰고 있어서, 쓰고싶은 함수를 자동으로 import해주면서 절대 경로로 표기를 하는데, Jest에서는 절대 경로로 표기하면 제대로 경로를 찾아가지 못함
- package.json에 작성되어있는 Jest 설정에서 파일을 찾는 방식을 바꿔줘야함

[코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/7cd138f71e450c25a05c74b7f1a330c4d2e80e2c/package.json#L73)

</div>
</details>

<details>
<summary>UserService 유닛 테스팅 Dependency 문제</summary>
<div markdown="1">

```
    Nest can't resolve dependencies of the UserService (?, VerificationRepository, JwtService, MailService). Please make sure that the argument UserRepository at index [0] is available in the RootTestModule context.

    Potential solutions:
    - If UserRepository is a provider, is it part of the current RootTestModule?
    - If UserRepository is exported from a separate @Module, is that module imported within RootTestModule?
      @Module({
        imports: [ /* the Module containing UserRepository */ ]
      })
```

- 유닛 테스트 과정에서 Repository를 제공하지 않아서 생기는 문제
- 실제 Repository를 그대로 쓸 수는 없기 때문에(써서도 안됨), 가짜함수, 클래스, Repository(Mocking)를 만들어 제공

[코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/7cd138f71e450c25a05c74b7f1a330c4d2e80e2c/src/users/users.service.spec.ts#L9)

</div>
</details>

<details>
<summary>editProfile E2E Test 문제</summary>
<div markdown="1">

> QueryFailedError: duplicate key value violates unique constraint "REL_8300048608d8721aea27747b07"

- 각 user당 하나의 verification만 만들 수 있도록 typeORM의 관계설정을 해놓은 상태 [코드 확인](https://github.com/Soujiro-a/nuber-eats-backend/blob/7ad8af837324fc7aa9e23add427ff6823443b046/src/users/entities/verification.entity.ts#L15)
- 해당 E2E 테스트에서 현재 verification가 존재하는 상태에서 editProfile mutation을 통해 동일 한 userId를 가진 verification column을 하나 더 만들려고하여 발생한 오류
- editProfile 함수내에 새 이메일을 변경하는 과정에서 기존 verification을 삭제하는 코드를 추가하여 해당 에러가 발생하지 않도록 하였음

[코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/b6b0d26b3f4cd9961ea41a2409a71a976d35e69f/src/users/users.service.ts#L125)

</div>
</details>

<details>
<summary>Schema Type 인식 문제</summary>
<div markdown="1">

> Error: Cannot determine a GraphQL input type ("Restaurant") for the "restaurants". Make sure your class is decorated with an appropriate decorator.

- appModule에 Restaurant Module을 통해 특정 스키마의 InputType, ObjectType을 가져오려고 할 때, 이름을 명시해주지 않아 같은 이름으로 스키마로 표시하려고 해서 발생한 문제다
- 두 Type이 같은 이름을 가지고 있었기 때문에, InputType에 다른 이름을 할당해주어 다른 스키마로 표시되게 함으로서 오류를 해결할 수 있었다.

[코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/8c2598c0131d235903e0cff446104683ca3e12e4/src/restaurants/entities/restaurant.entity.ts#L8)

</div>
</details>

<details>
<summary>E2E Test Connection Error</summary>
<div markdown="1">

> AlreadyHasActiveConnectionError: Cannot create a new connection named "default", because connection with such name already exist and it now has an active connection session.

- 중복 커넥션때문에 발생하는 문제
- 해당 프로젝트의 경우, e2e 테스트 코드의 AfterAll에서 app을 close할 때 비동기 처리를 해주지 않아 첫 테스트의 app이 닫히지 않아, 두번째 테스트부터 해당 에러가 발생하였다
- 문제에 나와있듯이, app.close를 비동기 처리해줌으로서 해결할 수 있었다.

</div>
</details>

<details>
<summary>E2E Test Connection Error</summary>
<div markdown="1">

> QueryFailedError: duplicate key value violates unique constraint "pg_type_typname_nsp_index"

- e2e 테스트 파일이 여러개일 때, 기본적으로 병렬로 실행하기 때문에, 동시에 테이블을 생성하며 오류가 발생
- Jest CLI 옵션 중, [runInBand](https://jestjs.io/docs/cli#--runinband)를 추가해주면 모든 테스트를 직렬로 실행하도록 변경할 수 있음

[참고한 링크](https://github.com/typeorm/typeorm/issues/6125)

</div>
</details>

<details>
<summary>Subscription할 때 Context의 Connection이 undefined로 나오는 문제</summary>
<div markdown="1">

- 처음에는 installSubscriptionHandlers 옵션을 true로 하고 context에서 connection 값을 가져오려고 했다.
- 그러나, connection 값이 undefined로 잡히며 처음에 사용하고자 했던 방법을 사용할 수 없게 되었다.
- Nestjs 공식 문서에 있는 GraphQL의 [Subscription 파트](https://docs.nestjs.com/graphql/subscriptions)에서는 installSubscriptionHandlers 옵션을 true로 설정하는 방법이 최신 버전에서는 사용되지 않고, 다른 방법을 사용하라는 경고문을 보았다.

- 해당 경고문 하단에는 subscriptions 옵션에서 graphql-ws 패키지를 true로 설정하라는 방법이 나와있어서 해당 방법을 사용해보려고 했는데 아래와 같은 메시지가 콘솔에 나왔다.

  > WebSocket protocol error occured. It was most likely caused due to an unsupported subprotocol "graphql-ws" requested by the client. graphql-ws implements exclusively the "graphql-transport-ws" subprotocol, please make sure that the client implements it too.

- 번역기의 도움(..)을 받아보니, graphql-ws는 클라이언트에서 지원하지 않는 graphql-transport-ws의 하위 프로토콜을 단독으로 생성하니 확인해보라는 이야기였다.
- 해당 메시지만 나오고 결과값을 받아보기위한 console.log도 제대로 동작하지 않아서, graphql-ws 패키지를 true로 설정하라는 방법으로는 못할 것 같아 다른 방법이 없나 물색해보았다.

- 그러다 문득 눈에 들어온 게, 공식문서에 있는 힌트문이었다.
  > You can also use both packages (subscriptions-transport-ws and graphql-ws) at the same time, for example, for backward compatibility.
- graphql-transport-ws 패키지도 graphql-ws 패키지와 똑같이 설정할 수 있는게 아닐까 싶어 true로 설정해보았지만 실패했다.
- 이후, 각 패키지의 공식문서를 찾아보다가, 문득 해당 옵션들의 인터페이스를 파고 들어가다보면 무언가 있지 않을까해서 살펴보기 시작했다.
- 그러다 GraphQLModule 옵션의 인터페이스에서 두 패키지를 설정할 때 사용가능한 서버옵션들을 찾게되었다.
- 그 중에서, 나는 처음에 연결할 때 토큰 값을 넘겨주고 싶은 것이었기 때문에 변수명으로 봤을 때 알맞을 것 같은 onConnect 옵션을 사용해보기로 하였다.
- 해당 옵션은 함수 형태로 사용해야된다고해서 찾아보던 와중, [graphql-transpost-ws의 npm 문서](https://www.npmjs.com/package/subscriptions-transport-ws)에서 onConnect 옵션을 찾았다.
- 그래서 첫번째 인자를 받아, console.log로 첫번째 인자값을 보니, http headers에 설정한 값이 그대로 콘솔에 나왔다.
- 결과적으로, http를 사용할 때 뿐 아니라, subscriptions 사용을 위한 WebSocket을 시작할 때도 토큰 값을 담아 guard에 보내도록 설정할 수 있었다.

[코드 첨부](https://github.com/Soujiro-a/nuber-eats-backend/blob/5fa77611e46748a6cdd6fd729599042660217ea7/src/app.module.ts#L64)

</div>
</details>
