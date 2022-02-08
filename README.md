# :pushpin: Nuber Eats

> [우버 이츠 클론코딩](https://nomadcoders.co/nuber-eats) 강의 백엔드 파트 결과물

## :calendar: 1. 제작 기간 & 참여 인원

- 2022.01.26 ~
- 개인 프로젝트

## :computer: 2. 사용 기술

- Node.js
- Nest.js
- GraphQL
- TypeORM
- PostgreSQL
- jsonwebtoken

## :hammer: 3. ERD 설계

<details>
<summary>User</summary>
<div markdown="1">

### User Entity

- id
- createdAt
- updatedAt
- email
- password
- role(client|owner|delivery)

</div>
</details>

## :dart: 4. 구현 기능

<details>
<summary>Configuration</summary>
<div markdown="1">

- [NestJS ConfigModule](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/app.module.ts#L18)
- [TypeORM ConfigModule](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/app.module.ts#L35)
- [GraphQL ConfigModule](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/app.module.ts#L46)
- [Create jsonwebtoken middleware](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/jwt/jwt.middleware.ts#L7)
- [Use jsonwebtoken middleware for '/graphql' routes, POST Method](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/app.module.ts#L60)

</div>
</details>

<details>
<summary>User CRUD</summary>
<div markdown="1">

- [Create Account](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/users/users.service.ts#L16)
- [Log In](https://github.com/Soujiro-a/nuber-eats-backend/blob/c5fd08624ead654a1960e8dbdb982ef91fb19b3e/src/users/users.service.ts#L40)
- [See Profile](https://github.com/Soujiro-a/nuber-eats-backend/blob/d73665896abeb2681b1716322f096bcd1ad057b6/src/users/users.resolver.ts#L52)
- [Edit Profile](https://github.com/Soujiro-a/nuber-eats-backend/blob/2f113d1c89355ea0a7cb12cf4f401b05835d6f51/src/users/users.resolver.ts#L75)
- [Verify Email](https://github.com/Soujiro-a/nuber-eats-backend/blob/2d323c1358f3f408afada866f1040f324dac358a/src/users/users.service.ts#L109)

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
