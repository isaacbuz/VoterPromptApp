import { VoteItem } from './cb-vote-widget';

// import ReactDOM from "react-dom" // if using React 17

import r2wc from "@r2wc/react-to-web-component"

const WebVoteWidget = r2wc(VoteItem)

customElements.define("cb-vote", WebVoteWidget)