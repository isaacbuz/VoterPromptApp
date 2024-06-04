import React from 'react';

function VoteItem() {

    function redirect() { window.location = "https://register.vote.org" as unknown as Location; }

    return (
        <div>
            <div>
                <img
                src="https://cb-cds-sed-web-oak.s3.amazonaws.com/assets/oYFVote.svg" alt="Vote" />
            </div>
            <button onClick={redirect} aria-label="Register to vote">
                Register to vote
            </button>
        </div>
    );
}

export {VoteItem};