#!/usr/bin/env python3
import aws_cdk as cdk

from pa_infra.pa_stack import PaStack

app = cdk.App()

PaStack(
    app,
    "PaStack",
    env=cdk.Environment(
        account="818214664804",
        region="us-west-2"
    ),
)

app.synth()
