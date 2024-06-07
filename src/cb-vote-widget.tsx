import React from 'react';
import './style.css'
function VoteItem() {

    function redirect() { window.location = "https://register.vote.org" as unknown as Location; }

    return (
      <div className={'voter-widget-container'}>
        <div className={'voter-widget-header'}>
          You can register to vote.
        </div>
        <div className={'voter-widget-image'}>
          <img
            src="https://cb-cds-sed-web-oak.s3.amazonaws.com/assets/oYFVote.svg" alt="Vote" />
        </div>
        <div className={'voter-widget-footer'}>
          It only takes two mins.

        </div>
        <div className={'voter-button-container'}>

          <button className={'voter-button voter-button-primary'} onClick={redirect} aria-label="Register to vote">
            Register to Vote
          </button>
        </div>
      </div>
    );
}

export { VoteItem };