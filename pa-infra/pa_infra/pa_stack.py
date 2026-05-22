from aws_cdk import (
    Stack,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_certificatemanager as acm,
    aws_cloudfront_origins as origins,
    aws_iam as iam,
    CfnOutput,
)
from constructs import Construct


class PaStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Import existing S3 bucket for frontend hosting
        site_bucket = s3.Bucket.from_bucket_name(
            self,
            "ExistingReactBucket",
            "crescent-react-hosting",
        )

        # S3 origin for frontend static files
        s3_origin = origins.S3BucketOrigin.with_origin_access_control(
            site_bucket,
            origin_path="/pa_connection",
        )


        # CloudFront distribution
        distribution = cloudfront.Distribution(
            self,
            "pa-connection",
            domain_names=["https://connections-dashboard.cascadiaquakes.org/"],
            certificate=acm.Certificate.from_certificate_arn(
                self,
                "PaCert",
                "arn:aws:acm:us-east-1:818214664804:certificate/744ef1b1-bbbd-475e-ad42-136337bd77c4"
            ),
            default_root_object="index.html",
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
        )

        # Stack outputs
        frontend_url = f"https://{distribution.distribution_domain_name}"

        CfnOutput(
            self,
            "FrontendURL",
            value=f"{frontend_url}/index.html",
            description="partners connections viewer"
        )