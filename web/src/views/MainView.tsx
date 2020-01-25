import React, { Fragment } from "react";
import Helper from "../assets/images/helper.png";

export default function () {
    return (
        <Fragment>
            <p>Please provide a task ID as shown in the image.</p>
            <img src={Helper} alt="url with task id"></img>
        </Fragment>
    )
}