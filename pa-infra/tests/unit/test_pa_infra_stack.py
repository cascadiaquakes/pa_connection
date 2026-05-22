import aws_cdk as core
import aws_cdk.assertions as assertions

from pa_infra.pa_infra_stack import PaInfraStack

# example tests. To run these tests, uncomment this file along with the example
# resource in eq_infra/eq_infra_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = EqInfraStack(app, "pa-infra")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
