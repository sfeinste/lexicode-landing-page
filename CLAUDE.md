This folder contains the frontend (app/frontend) and backend (app/backend) for a SaaS application that connects to users github accounts and pulls their repositories down and sends the code to an LLM to generate code documentation in markdown. It saves that markdown in a database and presents that in the frontend as browsable documentation. 

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Pause every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the todo.md file with a summary of the changes you made and any other relevant information.


# Workflow
- Prefer running single tests, and not the whole test suite, for performance
- Be sure to run tests and then run npm run dev after making changes to make sure things still work.