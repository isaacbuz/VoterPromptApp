import React from 'react';
import './style.css'
import VoterImage from "./assets/ownYourFuture.svg"
interface VoteItemProps {
  partnerid: string,
  campaigncode: string
}
export const VoteItem = (props:VoteItemProps) => {
    function redirect() {
      let url = 'https://register.vote.org/'

      if (props.campaigncode || props.partnerid){
        url = url.concat("?")
        if (props.partnerid){
          url = url.concat(`partnerId=${props.partnerid}`)
          if (props.campaigncode){
            url = url.concat(`&campaignCode=${props.campaigncode}`)
          }
        }
        else if (props.campaigncode){
          url = url.concat(`campaignCode=${props.campaigncode}`)
        }
      }
      console.log(props)
      console.log(url)
      window.location = url as unknown as Location;
    }
  console.log(props.campaigncode)
    return (
      <div className={'voter-widget-container'}>
        <div className={'voter-widget-header'}>
          You can register to vote.
        </div>
        <div className={'voter-widget-image'}>
         <VoterImage/>
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
