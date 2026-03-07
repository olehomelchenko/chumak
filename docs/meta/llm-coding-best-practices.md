# LLM-Assisted Coding: Best Practices Reference

> Personal reference for working with Claude Code, Opencode, Codex, and similar tools.  
> Goal: keep codebases maintainable, reduce compound complexity, stay in control.

---

## Core mindset

The LLM is a fast, knowledgeable, over-confident pair programmer — not an autonomous engineer.
**You are the architect. The LLM accelerates execution.**

- Only ship code you've read and understood
- If generated code is convoluted, ask for an explanation or rewrite it yourself
- LLM mistakes can be deeply non-human (hallucinated APIs, subtle logic errors) — stay alert

---

## Working as a partial-stack architect

> This section applies when you understand the problem domain and can follow code logic,  
> but lack deep expertise in the specific stack (e.g. Preact/TypeScript/Vite ecosystem conventions).  
> You can govern _what_ the code does, but not always _whether it's the right way_ to do it.

The control model shifts: **you can't fully govern the code, so you govern behavior, architecture, and contracts instead.**

### Shift from code review to behavior verification

- Your primary quality gate is: _does it do what I expect, across the cases I care about?_
- Test at the interface level — inputs, outputs, UI behavior — not at the implementation level
- Write or ask the LLM to write explicit test cases _before_ implementation, so you have something to verify against
- Manual testing counts: clicking through the UI deliberately is a legitimate review for personal projects

### Make the LLM audit itself

When you can't evaluate an architectural decision, ask the model to do it for you:

- _"What are the tradeoffs of this approach vs. alternatives? What might I regret later?"_
- _"What assumptions did you make here that I should know about?"_
- _"Is this idiomatic for a Preact/TypeScript project in 2025, or is this a shortcut?"_
- _"What could go wrong with this that wouldn't be obvious until the project is larger?"_

This surfaces silent decisions. The model won't always be right, but it will often catch things it would otherwise bury in implementation.

### Enforce architectural constraints before coding begins

The less you can audit implementation, the more important it is to constrain what the implementation is allowed to do.

- Define module boundaries explicitly in your `ARCHITECTURE.md` — what is each file/folder responsible for, and what is it _not_ allowed to do
- Agree on patterns upfront: _"all data fetching goes through X, all state lives in Y"_ — this is checkable by you without deep stack knowledge
- When the LLM deviates from agreed structure, that's visible even without stack expertise

### Ask for plain-language explanations of stack-specific choices

- When the LLM adds a new dependency, config, or build tool — ask: _"explain what this does and why it's needed, assuming I know JS but not the Vite ecosystem"_
- If the explanation doesn't make sense or feels like over-engineering for a personal project, push back
- You don't need to know if it's "correct" — you need to know if it's _necessary_

### Dependency hygiene is especially critical here

When you can't evaluate architecture deeply, package sprawl becomes your biggest long-term risk:

- Require justification for every new `npm install` — ask what problem it solves that couldn't be solved with 20 lines of code
- Prefer dependencies that are: widely used, actively maintained, and doing genuinely hard things (parsing, rendering, crypto)
- Periodically ask: _"list all dependencies and explain what each one does in one sentence — flag any that seem redundant or unused"_
- Lock versions and commit `package-lock.json` so changes are visible in diffs

### Keep a `DECISIONS.md` log

Since you can't evaluate implementation against stack conventions, compensate by logging _why_ decisions were made:

- One entry per meaningful architectural or dependency choice
- Format: **decision → reason → alternatives considered → date**
- This is your audit trail. Future you (and future LLM sessions) will have context that isn't in the code itself.

### Red flags specific to this mode

- LLM adds a config file you don't recognize (`.browserslistrc`, `tsconfig.paths.json`, etc.) without explaining why
- Dependency count grows faster than feature count
- Build process gets more complex — more scripts in `package.json`, more config files at root
- LLM says _"this is the standard way to do X"_ without you being able to verify that claim
- `ARCHITECTURE.md` no longer matches what you observe when you open the project

---

## Before writing any code

### 1. Spec first, always

- Describe the problem to the LLM and ask it to **iteratively ask you questions** until requirements are clear
- Compile the result into a `spec.md`: goals, constraints, data models, edge cases, testing strategy
- Think of it as a "waterfall in 15 minutes" — slow to start, fast to execute

### 2. Generate an architecture plan before coding

- Ask the LLM to produce an `ARCHITECTURE.md`: module responsibilities, data flow, key data structures
- **Review this plan yourself** before any code is written
- Keep this doc in sync as the codebase evolves — it's the shared map between you and the agent

---

## During development

### 3. Work in small, contained chunks

- One function, one bug, one feature per prompt — never large monolithic requests
- Each chunk should leave the project in a working state
- Use a structured "prompt plan" (a sequenced task list) for longer sessions
- If the output is messy or inconsistent, stop — break the task smaller and restart

### 4. Commit often

- Commit at the end of every meaningful session or completed chunk
- Small commits = small blast radius when something goes wrong
- Treat version control as your undo history for AI-assisted work

### 5. Refactor continuously

- Don't let entropy accumulate — periodically ask the LLM to refactor, deduplicate, and simplify
- Do this _during_ development, not only at the end
- A codebase that grows messy fast will confuse future agent sessions just as much as it confuses humans

### 6. Close the feedback loop fast

- AI assistance is most effective when you can verify results quickly
- Prioritize: linting, unit tests, type checking running on every change
- Consider a linter stop-hook that auto-runs and feeds errors back to the agent to fix

---

## Context management

### 7. Write and maintain a `CLAUDE.md` / `AGENTS.md`

This file is loaded at the start of every agent session. Think of it as onboarding a new team member with amnesia.

**What to include:**

- Build and test commands
- Key directory structure
- Domain-specific terminology (entity names, acronyms, business concepts)
- Conventions the agent can't infer from code (e.g. "use `uv`, not `pip`")
- MCP tools available and when to use them

**What to avoid:**

- Anything already obvious from the code or README
- Long style guides (link to them instead, with context for _when_ to read)
- Negative-only constraints without alternatives ("never use X" → "use Y instead of X")
- LLM-auto-generated content as a final product — use `/init` as a draft, then trim aggressively

**Target:** under 300 lines. Models follow ~150–200 instructions reliably; every line competes for attention.

> **Note:** A recent ETH Zurich study found that LLM-generated context files perform _no better_ than no context file. Human-written, focused context files consistently outperform them. Write it yourself, keep it short.

### 8. Manage context window actively

- Context window fills fast; LLM performance degrades as it fills
- Start a **fresh session** when switching to a different phase (e.g. implementation → security review)
- Use subagents for isolated tasks to keep the main context clean
- Run `/context` mid-session to check how full the window is

### 9. Pack context explicitly for complex tasks

- Don't assume the agent knows your codebase — show it the relevant files
- For niche libraries or new APIs, paste in the docs or README
- Tools like `gitingest` or `repo2txt` can bundle relevant source files into a single ingestible text

---

## Documentation discipline

### 10. Keep docs and code in lockstep

- Every meaningful change → update `spec.md`, `ARCHITECTURE.md`, and `CLAUDE.md` as needed
- Outdated docs cause agent drift — the model will follow them even when they're wrong
- Treat documentation as infrastructure, not an afterthought

---

## Dependency and library hygiene

### 11. Be deliberate about adding dependencies

With AI-assisted coding, the cost of generating a custom implementation is much lower than before.
Ask yourself for each library:

- Does it solve a **genuinely hard problem** (security, parsing, concurrency)? → use it
- Does it just **save me writing boilerplate** that generation makes cheap? → consider rolling your own

Fewer dependencies = fewer surface areas for the agent to hallucinate incorrect API usage.

---

## Prompting patterns that help

| Situation                | Pattern                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Starting a new feature   | "Before coding, ask me clarifying questions until we've covered requirements and edge cases"     |
| Stuck or output is bad   | Stop, break smaller, start fresh session                                                         |
| Reviewing generated code | "Add inline comments explaining every non-obvious decision in this function"                     |
| Architecture question    | "What are 2–3 approaches here? List tradeoffs before recommending one"                           |
| Refactoring              | "Identify duplication and unnecessary complexity in this module without changing behavior"       |
| Context issue            | "What do you know about this codebase so far? What are you uncertain about?"                     |
| Stack-specific audit     | "Is this idiomatic for a Preact/TypeScript project in 2025, or is this a shortcut I'll regret?"  |
| New dependency added     | "Explain what this package does and why it's needed — could we avoid it?"                        |
| Silent assumptions       | "What did you decide here that I should know about? What might I regret at 5× the current size?" |
| Dependency review        | "List all dependencies and explain each in one sentence. Flag anything redundant or unused."     |

---

## Red flags to watch for

- Generated code that "works" but you can't explain why
- Agent confidently using an API method you don't recognize — verify it exists
- Codebase growing but no architecture or spec docs being updated
- Long sessions with no commits
- `CLAUDE.md` that hasn't been touched in weeks while the project has changed significantly
- Asking for too much in one prompt and getting an output that "feels like 10 devs without talking to each other"

---

## Quick-start checklist for a new project

- [ ] Write a `spec.md` before any code
- [ ] Generate and review an `ARCHITECTURE.md` with explicit module boundaries
- [ ] Create a lean, human-written `CLAUDE.md` / `AGENTS.md`
- [ ] Create a `DECISIONS.md` for logging architectural and dependency choices
- [ ] Set up linting + type checking with fast feedback
- [ ] Establish a commit-per-session habit
- [ ] Create a `.claude/commands/` directory for reusable slash commands

---

_Sources: Addy Osmani (Jan 2026), Honeycomb engineering blog, Wojtek Jurkowlaniec, HumanLayer blog, Anthropic Claude Code docs, ETH Zurich / LogicStar.ai AGENTS.md study (Mar 2026)_
