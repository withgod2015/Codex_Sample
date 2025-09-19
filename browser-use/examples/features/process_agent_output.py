import asyncio
import os
import sys
from pprint import pprint

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv

load_dotenv()

from browser_use import Agent, ChatOpenAI
from browser_use.agent.views import AgentHistoryList
from browser_use.browser import BrowserProfile, BrowserSession
from browser_use.browser.profile import ViewportSize

llm = ChatOpenAI(model='gpt-4.1-mini')


async def main():
	browser_session = BrowserSession(
		browser_profile=BrowserProfile(
			headless=False,
			traces_dir='./tmp/result_processing',
			window_size=ViewportSize(width=1280, height=1000),
			user_data_dir='~/.config/browseruse/profiles/default',
		)
	)
	await browser_session.start()
	try:
		agent = Agent(
			task="go to google.com and type 'OpenAI' click search and give me the first url",
			llm=llm,
			browser_session=browser_session,
		)
		history: AgentHistoryList = await agent.run(max_steps=3)

		print('Final Result:')
		pprint(history.final_result(), indent=4)

		print('\nErrors:')
		pprint(history.errors(), indent=4)

		# e.g. xPaths the model clicked on
		print('\nModel Outputs:')
		pprint(history.model_actions(), indent=4)

		print('\nThoughts:')
		pprint(history.model_thoughts(), indent=4)
	finally:
		await browser_session.stop()


if __name__ == '__main__':
	asyncio.run(main())
