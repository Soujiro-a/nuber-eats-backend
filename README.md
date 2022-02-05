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
- See Profile
- Edit Profile
- Verify Email

</div>
</details>

## :rotating_light: 5. 트러블 슈팅

<details>
<summary>트러블 명</summary>
<div markdown="1">

```
이곳에 에러 상세 표기
```

:pushpin: 코드 첨부

</div>
</details>
