# Git Workflow

## First setup

Clone the repository:

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd streamweaver
```

## Before starting work

```bash
git checkout main
git pull origin main
git checkout -b feature/member-name-task
```

Example:

```bash
git checkout -b feature/member1-stream-upload
```

## Commit

```bash
git add .
git commit -m "feat: add streaming upload foundation"
```

## Push

```bash
git push -u origin feature/member1-stream-upload
```

Then create a Pull Request into `main`.

## Important

Do not all work directly on `main`.

Each member should use their own feature branch and merge through Pull Requests.
