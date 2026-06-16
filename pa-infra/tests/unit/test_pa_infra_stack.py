import aws_cdk as core
import aws_cdk.assertions as assertions

from pa_infra.pa_stack import PaStack


def test_cloudfront_distribution_configuration():
    app = core.App()
    stack = PaStack(app, "PaStack")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties(
        "AWS::CloudFront::Distribution",
        {
            "DistributionConfig": {
                "Aliases": ["connections-dashboard.cascadiaquakes.org"],
                "DefaultRootObject": "index.html",
                "DefaultCacheBehavior": {
                    "ViewerProtocolPolicy": "redirect-to-https",
                },
                "Origins": assertions.Match.array_with(
                    [
                        assertions.Match.object_like(
                            {
                                "OriginPath": "/pa_connection",
                            }
                        )
                    ]
                ),
            }
        },
    )

    template.has_output(
        "FrontendURL",
        {
            "Description": "partners connections viewer",
        },
    )
