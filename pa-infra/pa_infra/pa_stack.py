from aws_cdk import (
    RemovalPolicy,
    Stack,
    aws_s3 as s3,
    aws_cloudfront as cloudfront,
    aws_certificatemanager as acm,
    aws_cloudfront_origins as origins,
    CfnOutput,
)
from constructs import Construct


class PaStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # Shared S3 bucket for CRESCENT viewers. Only the /pa_connection prefix
        # belongs to this stack; the bucket is imported by name so we never
        # touch its policy.
        site_bucket = s3.Bucket.from_bucket_name(
            self,
            "ExistingReactBucket",
            "crescent-react-hosting",
        )

        # Reference the pre-existing OAC (created manually alongside the
        # original CloudFront distribution) so cdk import matches the live
        # resource instead of trying to create a new OAC.
        existing_oac = cloudfront.S3OriginAccessControl.from_origin_access_control_id(
            self,
            "ExistingOAC",
            "E34I65CJ1URTPH",
        )

        s3_origin = origins.S3BucketOrigin.with_origin_access_control(
            site_bucket,
            origin_path="/pa_connection",
            origin_access_control=existing_oac,
        )

        # Distribution matches the live E1BIIZAM9A7ROC configuration so cdk
        # import registers it under CloudFormation ownership without drift.
        # The web_acl_id is the CloudFront-managed WAF that ships with the
        # pricing tier this distribution is on; removing it triggers a
        # provider-side rejection during import.
        distribution = cloudfront.Distribution(
            self,
            "pa-connection",
            comment="dist for the p&a network dashboard",
            domain_names=["connections-dashboard.cascadiaquakes.org"],
            certificate=acm.Certificate.from_certificate_arn(
                self,
                "PaCert",
                "arn:aws:acm:us-east-1:818214664804:certificate/744ef1b1-bbbd-475e-ad42-136337bd77c4",
            ),
            default_root_object="index.html",
            web_acl_id="arn:aws:wafv2:us-east-1:818214664804:global/webacl/CreatedByCloudFront-27a562d6/0397bfcf-3680-41a5-8d67-c575925502ab",
            default_behavior=cloudfront.BehaviorOptions(
                origin=s3_origin,
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
                response_headers_policy=cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
            ),
        )
        # Safety net: if the stack is ever destroyed, keep the live distribution
        # and its OAC in place rather than tearing down user-facing infra.
        distribution.apply_removal_policy(RemovalPolicy.RETAIN)

        CfnOutput(
            self,
            "FrontendURL",
            value=f"https://{distribution.distribution_domain_name}/index.html",
            description="partners connections viewer",
        )
