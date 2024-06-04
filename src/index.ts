import 'babel-polyfill';
import { VoteItem } from './cb-vote-widget';
import { HtmlTagWrapper } from './html-tag-wrapper';

const WrappedCBVoteWidget = HtmlTagWrapper(VoteItem);

export default {
  CBVoteWidget: WrappedCBVoteWidget,
};
