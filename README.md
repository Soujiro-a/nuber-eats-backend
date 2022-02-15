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
- Jest

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

<details>
<summary>Unit Test</summary>
<div markdown="1">

- [User Service](https://github.com/Soujiro-a/nuber-eats-backend/blob/main/src/users/users.service.spec.ts)
- [Mail Service](https://github.com/Soujiro-a/nuber-eats-backend/blob/main/src/mail/mail.service.spec.ts)
- [JWT Service](https://github.com/Soujiro-a/nuber-eats-backend/blob/main/src/jwt/jwt.service.spec.ts)

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
