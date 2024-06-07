import 'babel-polyfill';
import { VoteItem } from './cb-vote-widget';
import { HtmlTagWrapper } from './html-tag-wrapper';
import r2wc from "@r2wc/react-to-web-component"

const WrappedCBVoteWidget = HtmlTagWrapper(VoteItem);

export default {
  CBVoteWidget: WrappedCBVoteWidget,
};
